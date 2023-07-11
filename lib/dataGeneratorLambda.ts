import {
    Runtime,
    Function,
    Architecture,
} from 'aws-cdk-lib/aws-lambda';
import { Table } from 'aws-cdk-lib/aws-dynamodb';
import { ManagedPolicy, Role, ServicePrincipal } from 'aws-cdk-lib/aws-iam';
import { aws_events, aws_events_targets, Duration } from 'aws-cdk-lib';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import { Construct } from 'constructs';
import { Stream } from 'aws-cdk-lib/aws-kinesis';

interface DataGeneratorLambdaResourcesProps {
    kinesisDataStream: Stream;
    stockPriceModificationTable: Table;
}

export class DataGeneratorLambdaResources extends Construct {
    public lambdaHandler: Function;
    public stockPriceModificationTable: Table

    constructor(scope: Construct, id: string, props: DataGeneratorLambdaResourcesProps) {
        super(scope, id);

        const lambdaHandlerRole = new Role(
            this,
            'stockDataGeneratorLambdaRole',
            {
                assumedBy: new ServicePrincipal('lambda.amazonaws.com'),
                managedPolicies: [
                    ManagedPolicy.fromAwsManagedPolicyName(
                        'service-role/AWSLambdaBasicExecutionRole',
                    ),
                ],
            },
        );

        this.lambdaHandler = new NodejsFunction(this, 'stockDataGeneratorLambdaHandler', {
            entry: 'lambda/dataGeneratorHandler.ts',
            runtime: Runtime.NODEJS_18_X,
            architecture: Architecture.ARM_64,
            timeout: Duration.seconds(60),
            role: lambdaHandlerRole,
            environment: {
                STREAM_NAME: props.kinesisDataStream.streamName,
                STOCK_PRICE_MODIFICATION_TABLE: props.stockPriceModificationTable.tableName,
            },
        });

        props.kinesisDataStream.grantReadWrite(this.lambdaHandler);
        props.stockPriceModificationTable.grantReadWriteData(this.lambdaHandler)

        new aws_events.Rule(this, 'data-generator-lambda-rule', {
            description: "Generate stock data based on time events",
            targets: [new aws_events_targets.LambdaFunction(this.lambdaHandler)],
            schedule: aws_events.Schedule.rate(Duration.minutes(1)),
        }
        );
    }
}