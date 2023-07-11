import { Handler } from 'aws-lambda';
import { KinesisClient, PutRecordsCommand } from "@aws-sdk/client-kinesis";
import { DynamoDBClient, ScanCommand, BatchWriteItemCommand } from '@aws-sdk/client-dynamodb';
import { marshall, unmarshall } from "@aws-sdk/util-dynamodb";
import {
    DynamoDBDocument,
} from '@aws-sdk/lib-dynamodb';

const ddbClient = new DynamoDBClient({});
const ddbDocClient = DynamoDBDocument.from(ddbClient);

const client = new KinesisClient({
    apiVersion: '2013-12-02',
    sslEnabled: false
});

function getRandomStockPrice(price: number) {
    const str = (Math.random() * 20 + price).toFixed(2);

    return parseFloat(str);
}

const stockRanges: Record<string, number> = {
    "AMD": 100,
    "AAPL": 180,
    "MSFT": 330,
    "AC": 20,
    "TSLA": 270,
    "TSM": 100,
    "V": 230,
}

const getStockModificationItems = async () => {
    const params = {
        TableName: process.env.STOCK_PRICE_MODIFICATION_TABLE,
        FilterExpression: "isProcessed = :isProcessed",
        ExpressionAttributeValues: {
            ':isProcessed': {
                "BOOL": false
            }
        }
    }
    const command = new ScanCommand(params);
    const response = await ddbDocClient.send(command);
    return response.Items.map(unmarshall)
}

const updateStockModificatinoItems = async (items) => {
    if (!items || !items.length) {
        return
    }

    const updatedItems = items.map((item: any) => ({...item, isProcessed: true}))

    const requests = updatedItems
        .map((item: any) => ({ "PutRequest": { "Item": marshall(item) } }))

    const response = await ddbDocClient.send(
        new BatchWriteItemCommand({
            "RequestItems": {
                [process.env.STOCK_PRICE_MODIFICATION_TABLE as string]: requests
            }
        }),
    );
    console.log(`Successfully updated stock modification data for: ${JSON.stringify(response)}`)
}

async function batchGenerate() {
    const curDateTime = new Date().toISOString()

    const stockModificationItems = await getStockModificationItems()
    const modificationMap = stockModificationItems.reduce((acc: any, item: any) => ({ ...acc, [item.symbol]: item.price }), {})

    const records = Object.keys(stockRanges).map(symbol => {
        const stock = {
            symbol,
            price: modificationMap[symbol] ? modificationMap[symbol] : getRandomStockPrice(stockRanges[symbol]),
            datetime: curDateTime
        }

        return {
            Data: Buffer.from(JSON.stringify(stock)),
            PartitionKey: "stocks",
        }
    })

    const input = {
        Records: records,
        StreamName: process.env.STREAM_NAME,
    }

    const command = new PutRecordsCommand(input);
    const response = await client.send(command);
    console.log(`Successfully insert data for ${curDateTime}: ${JSON.stringify(response)}`)

    await updateStockModificatinoItems(stockModificationItems)
}

export const handler: Handler = async (event) => {
    await batchGenerate()
}