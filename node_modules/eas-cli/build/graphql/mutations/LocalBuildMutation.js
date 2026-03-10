"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LocalBuildMutation = void 0;
const tslib_1 = require("tslib");
const graphql_1 = require("graphql");
const graphql_tag_1 = tslib_1.__importDefault(require("graphql-tag"));
const client_1 = require("../client");
const Build_1 = require("../types/Build");
exports.LocalBuildMutation = {
    async createLocalBuildAsync(graphqlClient, appId, job, artifactSource, metadata) {
        const data = await (0, client_1.withErrorHandlingAsync)(graphqlClient
            .mutation((0, graphql_tag_1.default) `
            mutation createLocalBuildMutation(
              $appId: ID!
              $jobInput: LocalBuildJobInput!
              $artifactSource: LocalBuildArchiveSourceInput!
              $metadata: BuildMetadataInput
            ) {
              build {
                createLocalBuild(
                  appId: $appId
                  job: $jobInput
                  artifactSource: $artifactSource
                  metadata: $metadata
                ) {
                  build {
                    id
                    ...BuildFragment
                  }
                }
              }
            }
            ${(0, graphql_1.print)(Build_1.BuildFragmentNode)}
          `, { appId, jobInput: job, artifactSource, metadata })
            .toPromise());
        return data.build.createLocalBuild.build;
    },
};
