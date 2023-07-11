import { DynamoDBClient, BatchWriteItemCommand } from '@aws-sdk/client-dynamodb';
import { marshall } from "@aws-sdk/util-dynamodb";
import {
    DynamoDBDocument
} from '@aws-sdk/lib-dynamodb';
import { Handler } from 'aws-lambda';

const ddbClient = new DynamoDBClient({});
const ddbDocClient = DynamoDBDocument.from(ddbClient);

export const handler: Handler = async (event) => {

    const requests = event.Records
        .map((record: any) => Buffer.from(record.kinesis.data, 'base64').toString(
            'utf8',
        ))
        .map((record: any) => JSON.parse(record))
        .map((record: any) => ({ "PutRequest": { "Item": marshall(record) } }))


    await ddbDocClient.send(
        new BatchWriteItemCommand({
            "RequestItems": {
                [process.env.STOCK_TABLE as string]: requests
            }
        }),
    );

    return {
        statusCode: 200,
    };
};