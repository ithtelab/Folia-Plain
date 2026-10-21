// Typed view of the product identity shared by the renderer and build tools.
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

export default identity;
