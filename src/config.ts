import { Schema } from 'koishi';

export interface Config
{
    loggerinfo: boolean;
    apiPrefix: string;
    apiKey: string;
}

export const Config: Schema<Config> = Schema.intersect([
    Schema.object({
        apiPrefix: Schema.string()
            .default('/monetary')
            .description("API 前缀"),
        apiKey: Schema.string()
            .default('')
            .description("API 鉴权密钥，留空则不启用鉴权"),
        loggerinfo: Schema.boolean()
            .default(false)
            .description("日志调试模式")
            .experimental(),
        }).description('调试设置'),
]);