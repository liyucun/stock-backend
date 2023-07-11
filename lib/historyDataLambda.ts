import { Duration } from 'aws-cdk-lib';
import { Table } from 'aws-cdk-lib/aws-dynamodb';
import { ManagedPolicy, Role, ServicePrincipal } from 'aws-cdk-lib/aws-iam';
import { Stream } from 'aws-cdk-lib/aws-kinesis';
import {
  Runtime,
  Function,
  Architecture,
  EventSourceMapping,
  StartingPosition,
} from 'aws-cdk-lib/aws-lambda';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import { Construct } from 'constructs';

interface ApiGatewayResourcesProps {
  kinesisDataStream: Stream;
  stockTable: Table;
}

export class HistoryDataLambdaResources extends Construct {
  public lambdaHandler: Function;

  constructor(scope: Construct, id: string, props: ApiGatewayResourcesProps) {
    super(scope, id);

    const lambdaHandlerRole = new Role(
      this,
      'historyDataLambdaSinkRole',
      {
        assumedBy: new ServicePrincipal('lambda.amazonaws.com'),
        managedPolicies: [
          ManagedPolicy.fromAwsManagedPolicyName(
            'service-role/AWSLambdaBasicExecutionRole',
          ),
        ],
      },
    );
    this.lambdaHandler = new NodejsFunction(this, 'historyDataLambdaHandler', {
      entry: 'lambda/historyDataHandler.ts',
      runtime: Runtime.NODEJS_18_X,
      architecture: Architecture.ARM_64,
      timeout: Duration.seconds(60),
      role: lambdaHandlerRole,
      environment: {
        STOCK_TABLE: props.stockTable.tableName,
      },
    });

    props.stockTable.grantReadWriteData(this.lambdaHandler);
    props.kinesisDataStream.grantReadWrite(this.lambdaHandler);

    new EventSourceMapping(this, 'eventSourceMapping', {
      target: this.lambdaHandler,
      eventSourceArn: props.kinesisDataStream.streamArn,
      startingPosition: StartingPosition.LATEST,
      batchSize: 20
    });
  }
}