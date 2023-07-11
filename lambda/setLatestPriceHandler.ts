import { DynamoDBClient, PutItemCommand } from '@aws-sdk/client-dynamodb';
import { marshall } from "@aws-sdk/util-dynamodb";
import {
    DynamoDBDocument,
} from '@aws-sdk/lib-dynamodb';

const ddbClient = new DynamoDBClient({});
const ddbDocClient = DynamoDBDocument.from(ddbClient);

export const handler = async (event: any = {}): Promise<any> => {
    const requestedStockSymbol = event.pathParameters.symbol;
    if (!requestedStockSymbol) {
        return {
            statusCode: 400, body: `Error: You are missing the path parameter stock symbol`, headers: {
                'Access-Control-Allow-Origin': '*',
            }
        };
    }

    if (!event.body) {
        return {
            statusCode: 400, body: 'invalid request, you are missing the parameter body', headers: {
                'Access-Control-Allow-Origin': '*',
            }
        };
    }

    const item = typeof event.body == 'object' ? event.body : JSON.parse(event.body);

    const input = {
        symbol: requestedStockSymbol,
        price: item.price,
        isProcessed: false,
    }

    const params = {
        TableName: process.env.STOCK_PRICE_MODIFICATION_TABLE,
        Item: marshall(input)
    };
    const command = new PutItemCommand(params);

    try {
        const response = await ddbDocClient.send(command);

        return {
            statusCode: 200, headers: {
                'Access-Control-Allow-Origin': '*',
            }
        };
    } catch (dbError) {
        return {
            statusCode: 500, body: JSON.stringify(dbError), headers: {
                'Access-Control-Allow-Origin': '*',
            }
        };
    }
};