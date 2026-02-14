import { Logger } from 'koishi'

export  function logger_status(logger: Logger, enable: boolean) {
    if (enable) {
        return logger
    } else {
        return null
    }
}
