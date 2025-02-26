import { ApplicationStates, ILog, IPageParameters, LogType, MessageAPI } from '@guardian/interfaces';
import { Singleton } from '../decorators/singleton';
import { IMessageResponse } from '../models/message-response';
import { MessageBrokerChannel } from '../mq';

@Singleton
export class Logger {
    private channel: MessageBrokerChannel;
    private readonly target: string = "logger-service";

    /**
     * Register channel
     * @param channel
     */
    public setChannel(channel: MessageBrokerChannel): any {
        this.channel = channel;
    }

    /**
     * Get channel
     */
    public getChannel(): MessageBrokerChannel {
        return this.channel;
    }

    /**
     * Request to logger service method
     * @param entity
     * @param params
     */
    public async request<T>(entity: string, params?: any): Promise<T> {
        try {
            const response: IMessageResponse<T> = await this.channel.request([this.target, entity].join('.'), params);
            if (!response) {
                throw Error('Server is not available');
            }
            if (response.error) {
                throw response.error;
            }
            return response.body;
        } catch (error) {
            console.error(error);
        }
    }

    private async write(type: LogType, message: string, attr?: string[], lvl: number = 1) {
        const logMessage: ILog = {
            message: message,
            type: type,
            attributes: attr,
            level: lvl
        }
        await this.request(MessageAPI.WRITE_LOG, logMessage);
    }

    public async info(message: string, attr?: string[], lvl: number = 1): Promise<void> {
        await this.write(LogType.INFO, message, attr, lvl);
    }

    public async warn(message: string, attr?: string[], lvl: number = 1): Promise<void> {
        await this.write(LogType.WARN, message, attr, lvl);
    }

    public async error(error: string | Error, attr?: string[], lvl: number = 1): Promise<void> {
        const message = typeof error === 'string' ? error : error.stack;
        await this.write(LogType.ERROR, message, attr, lvl);
    }

    public async getLogs(filters?: any, pageParameters?: IPageParameters, sortDirection?: string): Promise<any> {
        return await this.request(MessageAPI.GET_LOGS, {
            filters, pageParameters, sortDirection
        });
    }

    public async getAttributes(name?: string, existingAttributes: string[] = []): Promise<string[]> {
        return await this.request(MessageAPI.GET_ATTRIBUTES, { name, existingAttributes });
    }

    /**
     * Get service status
     *
     * @returns {ApplicationStates} Service state
     */
    public async getStatus(): Promise<ApplicationStates> {
        try {
            const res = await this.request(MessageAPI.GET_STATUS);
            if (!res) {
                throw new Error();
            }

            return res as ApplicationStates;
        }
        catch {
            return ApplicationStates.STOPPED;
        }
    }
}
