import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
    DynamoDBDocument,
    QueryCommand
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

    const params = {
        TableName: process.env.STOCK_TABLE,
        KeyConditionExpression: "symbol = :symbol",
        ExpressionAttributeValues: {
            ":symbol": requestedStockSymbol
        },
        ScanIndexForward: false,
        Limit: 100
    };
    const command = new QueryCommand(params);

    try {
        const response = await ddbDocClient.send(command);
        if (response.Items) {
            return {
                statusCode: 200, body: JSON.stringify(response.Items), headers: {
                    'Access-Control-Allow-Origin': '*',
                }
            };
        } else {
            return {
                statusCode: 404, headers: {
                    'Access-Control-Allow-Origin': '*',
                }
            };
        }
    } catch (dbError) {
        return {
            statusCode: 500, body: JSON.stringify(dbError), headers: {
                'Access-Control-Allow-Origin': '*',
            }
        };
    }
};