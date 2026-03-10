"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BuildWorkflow = void 0;
class BuildWorkflow {
    ctx;
    buildSteps;
    buildFunctions;
    constructor(ctx, { buildSteps, buildFunctions }) {
        this.ctx = ctx;
        this.buildSteps = buildSteps;
        this.buildFunctions = buildFunctions;
    }
    async executeAsync() {
        let maybeError = null;
        for (const step of this.buildSteps) {
            let shouldExecuteStep = false;
            try {
                shouldExecuteStep = step.shouldExecuteStep();
            }
            catch (err) {
                step.ctx.logger.error({ err });
                step.ctx.logger.error(`Runner failed to evaluate if it should execute step "${step.displayName}", using step's if condition "${step.ifCondition}". This can be caused by trying to access non-existing object property. If you think this is a bug report it here: https://github.com/expo/eas-cli/issues.`);
                maybeError = maybeError ?? err;
                this.ctx.markAsFailed();
            }
            if (shouldExecuteStep) {
                const startTime = performance.now();
                let stepResult;
                try {
                    await step.executeAsync();
                    stepResult = 'success';
                }
                catch (err) {
                    stepResult = 'failed';
                    maybeError = maybeError ?? err;
                    this.ctx.markAsFailed();
                }
                finally {
                    this.collectStepMetrics(step, stepResult, performance.now() - startTime);
                }
            }
            else {
                step.skip();
            }
        }
        if (maybeError) {
            throw maybeError;
        }
    }
    collectStepMetrics(step, result, durationMs) {
        if (!step.__metricsId) {
            return;
        }
        this.ctx.addStepMetric({
            metricsId: step.__metricsId,
            result,
            durationMs,
        });
    }
}
exports.BuildWorkflow = BuildWorkflow;
