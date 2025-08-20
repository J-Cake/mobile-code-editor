import Plugin from "../plugin.js";
import {GlobalState, ResourceProviderFactory} from "../state.js";
import {
    ByteRange,
    Directory,
    File, isDirectory,
    Metadata,
    PathNavigationList,
    ProviderID,
    Resource,
    ResourceProvider,
    ResourceUrl
} from "../workspace.js";

export default class LocalFileResourceProvider extends Plugin {
    register(state: GlobalState): void | Promise<void> {
        state.mutate(state => state.resourceProviders.push(LocalFileProvider satisfies ResourceProviderFactory));
    }
}

export class LocalFileProvider extends ResourceProvider {
    static display = "Local Directory";

    dir: LocalRootDirectory = null as any;

    public constructor(id: ProviderID) {
        super(id);
    }

    static async init(id: ProviderID): Promise<ResourceProvider> {
        const dir = await window.showDirectoryPicker({ id: `${id}-directory`, });

        return Object.assign(new LocalFileProvider(id), { dir: new LocalRootDirectory(dir, id) } satisfies Pick<LocalFileProvider, 'dir'>);
    }

    type(): { icon: string; icon_open: string; name: string; } {
        return {
            icon: '\ue2c7',
            icon_open: '\ue2c8',
            name: this.dir.name
        }
    }

    async get(nav: PathNavigationList): Promise<Resource> {
        let handle = this.dir as Resource;

        for (const path of nav.slice(0, -1))
            if (handle instanceof LocalDirectory)
                handle = await handle.getChild(path);

        return handle;
    }

    async createDirRecursive(nav: PathNavigationList): Promise<Directory> {
        let handle = this.dir as Directory;

        for (const path of nav)
            handle = await handle.createDir(path);

        return handle;
    }
}

export class LocalFile implements File {
    constructor(readonly handle: FileSystemFileHandle, private parent: LocalDirectory) {
    }

    get name(): string {
        return this.handle.name;
    }

    url(): ResourceUrl {
        const parent = this.parent.url();
        return ResourceUrl.fromParts(parent.components.provider, parent.components.path.concat(this.name));
    }

    async metadata(): Promise<Metadata> {
        const file = await this.handle.getFile()
        return {
            type: 'file',
            ...await this.handle.getFile().then(file => ({
                size: file.size,
                modified: new Date(file.lastModified)
            })),
        }
    }

    async read(bytes: ByteRange): Promise<Uint8Array> {
        const file = await this.handle.getFile();

        return new Uint8Array(await file.slice(bytes.offset, bytes.length).arrayBuffer());
    }

    async write(bytes: ByteRange, content: Uint8Array): Promise<void> {
        const writeHandle = await this.handle.createWritable({
            keepExistingData: true,
        });

        await writeHandle.write({
            type: 'write',
            position: bytes.offset,
            data: content,
            size: Math.min(bytes.length, content.byteLength),
        });
        await writeHandle.close();
    }
}

export class LocalDirectory implements Directory {
    constructor(readonly handle: FileSystemDirectoryHandle, private parent: LocalDirectory) {

    }

    get name(): string {
        return this.handle.name;
    }

    url(): ResourceUrl {
        const parent = this.parent.url();
        return ResourceUrl.fromParts(parent.components.provider, parent.components.path.concat(this.name));
    }

    async create(name: string): Promise<File> {
        return new LocalFile(await this.handle.getFileHandle(name, {
            create: true
        }), this);
    }

    async createDir(name: string): Promise<Directory> {
        return new LocalDirectory(await this.handle.getDirectoryHandle(name, {
            create: true
        }), this)
    }

    async exists(name: string): Promise<boolean> {
        for await (const entry of this.handle.keys())
            if (entry == name)
                return true;

        return false;
    }

    async getChild(name: string): Promise<Resource> {
        return await this.handle.getFileHandle(name)
            .then(file => new LocalFile(file, this))
            .catch(_ => this.handle.getDirectoryHandle(name).then(dir => new LocalDirectory(dir, this)));
    }

    async listChildren(): Promise<Resource[]> {
        const children: Resource[] = [];

        for await (const entry of this.handle.values())
            if (entry instanceof FileSystemFileHandle)
                children.push(new LocalFile(entry, this));
            else if (entry instanceof FileSystemDirectoryHandle)
                children.push(new LocalDirectory(entry, this));
            else
                throw new Error(`Unrecognised object type returned from native API`)

        return children;
    }

    async metadata(): Promise<Metadata> {
        return {
            type: "directory",
            entries: await count(this.handle.values())
        }
    }

    async remove(name: string): Promise<void> {
        return await this.handle.removeEntry(name, {
            recursive: true
        })
    }
}

class LocalRootDirectory extends LocalDirectory {
    constructor(handle: FileSystemDirectoryHandle, readonly id: ProviderID) {
        super(handle, null as any);
    }

    url() {
        return ResourceUrl.fromParts(this.id, []);
    }
}

async function count(iter: AsyncIterable<any>): Promise<number> {
    let c = 0;
    for await (const _ of iter) c++;

    return c;
}