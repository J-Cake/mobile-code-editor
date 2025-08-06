import mgr, {GlobalState, ProjectState, Settings} from "./state.js";
import {EditorList} from "./viewport.js";
import {Directory} from "./file-tree.js";

export default class Workspace {
    resourceProviders: ResourceProvider[] = [new class implements ResourceProvider {
        id: ProviderID;
        resources: WorkspaceDirectory;

        constructor() {
            const id = this.id = 0;
            this.resources = new class extends WorkspaceDirectory {
                constructor() {
                    super("", null as any);
                }

                url(): ResourceUrl {
                    return ResourceUrl.fromParts(id, []);
                }
            };
        }

        async get(nav: PathNavigationList): Promise<Resource> {
            const url = ResourceUrl.fromParts(this.id, nav);

            let res: Resource = this.resources;
            for (const link of nav)
                if (await isDirectory(res))
                    res = await (<Directory>res).getChild(link);
                else
                    throw FileSystemError.navIntoFile(url.toString());

            if (res)
                return res;

            throw FileSystemError.notFound(url.toString());
        }

        private async createDirRecursive(nav: PathNavigationList): Promise<Directory> {
            const url = ResourceUrl.fromParts(this.id, nav);

            let res: Resource = this.resources;
            for (const link of nav)
                if (await isDirectory(res) && !await (<Directory>res).exists(link))
                    res = await (<Directory>res).createDir(link);

                else if (await isFile(res))
                    throw FileSystemError.navIntoFile(url.toString());

                else
                    throw FileSystemError.notFound(url.toString());

            if (!await isDirectory(res))
                throw FileSystemError.notADirectory(url.toString());

            return <Directory>res;
        }

        async create(nav: PathNavigationList): Promise<File> {
            return await this.createDirRecursive(nav.slice(0, -1))
                .then(dir => dir.create(nav.at(-1)!));
        }

        async createDir(nav: PathNavigationList): Promise<Directory> {
            return await this.createDirRecursive(nav);
        }

        async getMetadata(nav: PathNavigationList): Promise<Metadata> {
            return await this.get(nav).then(res => res.metadata());
        }

        async remove(nav: PathNavigationList): Promise<void> {
            const url = ResourceUrl.fromParts(this.id, nav);

            const res = await this.get(nav.slice(0, -1));

            if (!await isDirectory(res))
                throw FileSystemError.notADirectory(url.toString());

            return await (<Directory>res).remove(nav.at(-1)!);
        }
    }];

    settings: Settings = {excludeFiles: []};
    state: ProjectState;

    label: string;

    constructor(readonly id: WorkspaceID, options: Partial<Workspace>) {
        mgr.mutate(state => this.settings = structuredClone(state.settings));

        this.state = {
            viewport: {
                openEditors: new EditorList(mgr)
            }
        };

        this.label = `Unnamed Workspace ${id}`;

        Object.assign(this, options);
    }

    private getProvider(path: Path | ResourceUrl): Promise<[ResourceProvider, ResourceUrl]> {
        const url = path instanceof ResourceUrl ? path : ResourceUrl.parse(path);

        const res = this.resourceProviders
            .find(i => i.id == url.components.provider);

        if (!res)
            return Promise.reject(FileSystemError.providerNotFound(url.toString()));

        return Promise.resolve([res, url]);
    }

    async get(path: Path | ResourceUrl): Promise<Resource> {
        const [res, url] = await this.getProvider(path);
        return await res.get(url.components.path);
    }

    async create(path: Path): Promise<File> {
        const [res, url] = await this.getProvider(path);
        return await res.create(url.components.path);
    }

    async createDir(path: Path): Promise<Directory> {
        const [res, url] = await this.getProvider(path);
        return await res.createDir(url.components.path);
    }

    async metadata(path: Path): Promise<Metadata> {
        const [res, url] = await this.getProvider(path);
        return await res.getMetadata(url.components.path);
    }

    async remove(path: Path): Promise<void> {
        const [res, url] = await this.getProvider(path);
        return await res.remove(url.components.path);
    }

    // Convenience functions
    async read(path: Path): Promise<Uint8Array> {
        const res = await this.get(path);

        if (!await isFile(res))
            throw FileSystemError.notAFile(path);

        const meta = await res.metadata();
        return (<File>res).read({ offset: 0, length: (<FileMetadata>meta).size });
    }
    async write(path: Path, data: Uint8Array): Promise<void> {
        const res = await this.get(path);

        if (!await isFile(res))
            throw FileSystemError.notAFile(path);

        const meta = await res.metadata();
        return (<File>res).write({ offset: 0, length: (<FileMetadata>meta).size }, data);
    }
    async readUtf8(path: Path): Promise<string> {
        return await this.read(path)
            .then(res => new TextDecoder().decode(res));
    }
    async writeUtf8(path: Path, data: string): Promise<void> {
        return await this.write(path, new TextEncoder().encode(data));
    }
}

export interface Resource {
    name: string;
    description?: string;
    metadata(): Promise<Metadata>;
    url(): ResourceUrl
}

const isDirectory = async <T extends Resource>(res: T): Promise<T extends Directory ? true : false> => await res.metadata().then(meta => meta.type == 'directory') as any;
const isFile = async <T extends Resource>(res: T): Promise<T extends File ? true : false> => await res.metadata().then(meta => meta.type == 'file') as any;

export interface File extends Resource {
    read(bytes: ByteRange): Promise<Uint8Array>;
    write(bytes: ByteRange, content: Uint8Array): Promise<void>;
}

export interface Directory extends Resource {
    listChildren(): Promise<Resource[]>;
    getChild(name: string): Promise<Resource>;
    create(name: string): Promise<File>;
    createDir(name: string): Promise<Directory>;
    remove(name: string): Promise<void>;
    exists(name: string): Promise<boolean>;
}

export async function readUtf8(file: File): Promise<string> {
    const meta = await file.metadata();

    const dec = new TextDecoder();

    return dec.decode(await file.read({ offset: 0, length: (<FileMetadata>meta).size }));
}

export async function writeUtf8(file: File, data: string): Promise<void> {
    const meta = await file.metadata();

    const enc = new TextEncoder();

    return await file.write({ offset: 0, length: (<FileMetadata>meta).size }, enc.encode(data));
}

export type WorkspaceID = number;
export type ProviderID = number;
export type Length = number;
export type ByteRange = { offset: Offset, length: NumBytes };
export type Offset = number;
export type NumBytes = Length;
export type Path = string;
export type PathNavigationList = string[];

export interface ResourceProvider  {
    id: ProviderID,
    get(nav: PathNavigationList): Promise<Resource>;
    getMetadata(nav: PathNavigationList): Promise<Metadata>;
    create(nav: PathNavigationList): Promise<File>;
    createDir(nav: PathNavigationList): Promise<Directory>;
    remove(nav: PathNavigationList): Promise<void>;
}

export type Metadata = ({ type: 'file' } & FileMetadata) | ({ type: 'directory' } & DirectoryMetadata);

export interface FileMetadata {
    size: NumBytes;
}

export interface DirectoryMetadata {
    entries: Length
}

export class WorkspaceFile implements File {
    constructor(public name: string, readonly parent: Directory) {}

    private data: Uint8Array = new Uint8Array(0);

    url(): ResourceUrl {
        const parent = this.parent.url();
        return ResourceUrl.fromParts(parent.components.provider, parent.components.path.concat(this.name));
    }

    metadata(): Promise<Metadata & FileMetadata> {
        return Promise.resolve({
            type: 'file',
            size: this.data.length
        } satisfies Metadata);
    }

    read(bytes: ByteRange): Promise<Uint8Array> {
        return Promise.resolve(this.data.slice(bytes.length, bytes.length));
    }

    async write(bytes: ByteRange, content: Uint8Array): Promise<void> {
        this.data.set(content.slice(0, Math.min(content.length, bytes.length)), bytes.offset);
    }

}

export class WorkspaceDirectory implements Directory {
    constructor(public name: string, readonly parent: Directory) {}

    readonly children: Record<string, Resource> = {};

    url(): ResourceUrl {
        const parent = this.parent.url();
        return ResourceUrl.fromParts(parent.components.provider, parent.components.path.concat(this.name))
    }

    getChild(name: string): Promise<Resource> {
        if (name in this.children)
            return Promise.resolve(this.children[name]);
        else
            return Promise.reject(FileSystemError.notFound(name));
    }

    exists(name: string): Promise<boolean> {
        return Promise.resolve(name in this.children);
    }

    listChildren(): Promise<Resource[]> {
        return Promise.resolve(Object.values(this.children));
    }

    create(name: string): Promise<WorkspaceFile> {
        const file = new WorkspaceFile(name, this);

        if (name in this.children)
            throw FileSystemError.alreadyExists(name);

        this.children[name]= file;

        return Promise.resolve(file);
    }

    createDir(name: string): Promise<Directory> {
        const dir = new WorkspaceDirectory(name, this);

        if (name in this.children)
            throw FileSystemError.alreadyExists(name);

        this.children[name]= dir;

        return Promise.resolve(dir);
    }

    remove(name: string): Promise<void> {
        if (!(name in this.children))
            throw FileSystemError.notFound(name);

        delete this.children[name];

        return Promise.resolve();
    }

    metadata(): Promise<Metadata> {
        return Promise.resolve({
            type: 'directory',
            entries: Object.keys(this.children).length
        } satisfies Metadata & DirectoryMetadata)
    }
}

export class FileSystemError extends Error {
    public name = "FileSystemError";

    constructor(public readonly message: string) {
        super(message);
    }

    static notFound(path: Path): FileSystemError {
        return new FileSystemError(`Resource was not found: ${path}`);
    }

    static alreadyExists(path: Path): FileSystemError {
        return new FileSystemError(`Resource already exists: ${path}`);
    }

    static navIntoFile(path: Path): FileSystemError {
        return new FileSystemError(`Attempted to get children of leaf: ${path}`);
    }

    static notAFile(path: Path): FileSystemError {
        return new FileSystemError(`The resource is not readable: ${path}`);
    }

    static notADirectory(path: Path): FileSystemError {
        return new FileSystemError(`The resource is not navigable: ${path}`);
    }

    static providerNotFound(path: Path): FileSystemError {
        return new FileSystemError(`Provider does not exist in the workspace: ${path}`);
    }
}

export class ResourceUrl {
    constructor(readonly path: Path, readonly components: Readonly<{
        provider: ProviderID,
        path: PathNavigationList
    }>) {}

    ext(): string {
        return this.components.path.at(-1)!.split('.').pop()?.toLowerCase() ?? '';
    }

    static parse(path: Path): ResourceUrl {
        const url = /^(?<provider>\d+):\/(?<path>(\/[^\/]+)*\/?)$/
            .exec(path)
            ?.groups;

        if (!url)
            throw new Error(`Invalid URL: ${url}`);

        return new ResourceUrl(path, {
            provider: Number(url.provider),
            path: url.path.split("/").filter(i => !!i)
        });
    }

    toString() {
        return ResourceUrl.toUrl(this.components.provider, this.components.path);
    }

    static toUrl(id: ProviderID, nav: PathNavigationList): string {
        return `${id}://${nav.filter(i => !!i).join('/')}`;
    }

    static fromParts(provider: ProviderID, path: PathNavigationList): ResourceUrl {
        return new ResourceUrl(ResourceUrl.toUrl(provider, path), { provider, path });
    }
}