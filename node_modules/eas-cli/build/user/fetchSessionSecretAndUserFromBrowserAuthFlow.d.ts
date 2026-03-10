export declare function fetchSessionSecretAndUserFromBrowserAuthFlowAsync({ sso }: {
    sso?: boolean | undefined;
}): Promise<{
    sessionSecret: string;
    id: string;
    username: string;
}>;
