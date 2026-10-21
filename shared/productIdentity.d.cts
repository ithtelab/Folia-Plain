// Typed CommonJS entry point for the shared product identity.
declare const identity: Readonly<{
    name: string;
    repositoryOwner: string;
    repositoryName: string;
    repository: string;
    repositoryUrl: string;
    issuesUrl: string;
    releasesUrl: string;
    appId: string;
    executableName: string;
    upstreamRepository: string;
    upstreamUrl: string;
    upstreamDocsUrl: string;
}>;

export = identity;
