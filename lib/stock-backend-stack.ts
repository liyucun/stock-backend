import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { DynamoDbResources } from './dynamoDb'
import { KDSResources } from './kds'
import { ApiGatewayResources } from './apiGateway'
import { DataGeneratorLambdaResources } from './dataGeneratorLambda';
import { HistoryDataLambdaResources } from './historyDataLambda';
import { GetHistoryDataLambdaResources } from './getHistoryDataLambda';
import { SetLatestPriceLambdaResources } from './setLatestPriceLambda';

export class StockBackendStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const dynamoDbResources = new DynamoDbResources(this, 'DynamoDbResources');
    const kdsResources = new KDSResources(this, 'KDSResources');

    const apiGatewayResources = new ApiGatewayResources(
      this,
      'ApiGatewayResources',
      {
        kinesisDataStream: kdsResources.kinesisDataStream,
        connectionTable: dynamoDbResources.connectionTable,
      },
    );

    new DataGeneratorLambdaResources(this, 'DataGeneratorLambdaResources', {
      kinesisDataStream: kdsResources.kinesisDataStream,
      stockPriceModificationTable: dynamoDbResources.stockPriceModificationTable
    })

    new HistoryDataLambdaResources(this, 'HistoryDataLambdaResources', {
      kinesisDataStream: kdsResources.kinesisDataStream,
      stockTable: dynamoDbResources.stockTable,
    })

    const historyDataLambdaResource = new GetHistoryDataLambdaResources(this, 'GetHistoryDataLambdaResources', {
      stockTable: dynamoDbResources.stockTable,
    })

    const setLatestPriceLambdaResources = new SetLatestPriceLambdaResources(this, 'SetLatestPriceLambdaResources', {
      stockPriceModificationTable: dynamoDbResources.stockPriceModificationTable
    })

    new cdk.CfnOutput(this, 'webSocketApi', {
      value: apiGatewayResources.webSocketApi.apiEndpoint,
    });
    new cdk.CfnOutput(this, 'historyDataApi', {
      value: historyDataLambdaResource.restApi.url,
    });
    new cdk.CfnOutput(this, 'setLatestPriceApi', {
      value: setLatestPriceLambdaResources.restApi.url,
    });
  }
}
