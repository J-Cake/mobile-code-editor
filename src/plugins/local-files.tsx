import Plugin from "../plugin.js";
import {GlobalState} from "../state.js";
import {
    Directory,
    File,
    Metadata,
    PathNavigationList,
    ProviderID,
    Resource,
    ResourceProvider,
    ResourceUrl
} from "../workspace.js";

export default class LocalFileResourceProvider extends Plugin {
    register(state: GlobalState): void | Promise<void> {
        state.mutate(state => state.resourceProviders.push(LocalFiles));
    }
}

export class LocalFiles extends ResourceProvider {
    static display = "Local Directory";

    dir: FileSystemDirectoryHandle = null as any;

    public constructor(id: ProviderID) {
        super(id);

        window.showDirectoryPicker({
            id: `${id}-directory`,
        }).then(dir => this.dir = dir);
    }

    type(): { icon: string; icon_open: string; name: string; } {
        return {
            icon: '\ue2c7',
            icon_open: '\ue2c8',
            name: this.dir.name
        }
    }

    async get(nav: PathNavigationList): Promise<Resource> {

    }

    async createDirRecursive(nav: PathNavigationList): Promise<Directory> {

    }
}

export class LocalFile implements File {

}

export class LocalDirectory implements Directory {
    name: string;

    create(name: string): Promise<File> {
        return Promise.resolve(undefined);
    }

    createDir(name: string): Promise<Directory> {
        return Promise.resolve(undefined);
    }

    exists(name: string): Promise<boolean> {
        return Promise.resolve(false);
    }

    getChild(name: string): Promise<Resource> {
        return Promise.resolve(undefined);
    }

    listChildren(): Promise<Resource[]> {
        return Promise.resolve([]);
    }

    metadata(): Promise<Metadata> {
        return Promise.resolve(undefined);
    }

    remove(name: string): Promise<void> {
        return Promise.resolve(undefined);
    }

    url(): ResourceUrl {
        return undefined;
    }

}