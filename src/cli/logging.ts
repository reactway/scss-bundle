import chalk, { Chalk } from "chalk";
import log from "loglevel";
import prefix from "loglevel-plugin-prefix";

const colors: { [key: string]: Chalk } = {
    trace: chalk.white,
    debug: chalk.white,
    info: chalk.green,
    warn: chalk.yellow,
    error: chalk.red
};

const levels: { [key: string]: string } = {
    trace: "trce",
    debug: "dbug",
    info: "info",
    warn: "warn",
    error: "erro"
};

prefix.reg(log);
log.enableAll();

prefix.apply(log, {
    format(level, _, timestamp) {
        return `${chalk.gray(`[${timestamp}]`)} ${colors[level.toLowerCase()](`${levels[level.toLowerCase()]}:`)}`;
    }
});

function appyMultilineText(logger: log.RootLogger): log.RootLogger {
    const originalFactory = logger.methodFactory;

    logger.methodFactory = (methodName, logLevel, loggerName) => {
        const rawMethod = originalFactory(methodName, logLevel, loggerName);
        return (message: unknown) => {
            String(message)
                .split("\n")
                .forEach(x => rawMethod(x));
        };
    };

    logger.setLevel(logger.getLevel());
    return logger;
}

export const Log = appyMultilineText(log);
