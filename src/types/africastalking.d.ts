declare module "africastalking" {
  interface ATConfig {
    apiKey: string;
    username: string;
  }

  interface SmsRecipient {
    statusCode: number;
    number: string;
    status: string;
    cost: string;
    messageId: string;
  }

  interface SmsSendResult {
    SMSMessageData: {
      Message: string;
      Recipients: SmsRecipient[];
    };
  }

  interface SmsSendOptions {
    to: string[];
    message: string;
    from?: string;
  }

  interface SMS {
    send(options: SmsSendOptions): Promise<SmsSendResult>;
  }

  interface ATClient {
    SMS: SMS;
  }

  function AfricasTalking(config: ATConfig): ATClient;
  export = AfricasTalking;
}
