
import { Duration } from 'aws-cdk-lib';
import { Table } from 'aws-cdk-lib/aws-dynamodb';
import { ManagedPolicy, Role, ServicePrincipal } from 'aws-cdk-lib/aws-iam';
import {
    Runtime,
    Function,
    Architecture,
} from 'aws-cdk-lib/aws-lambda';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import { Construct } from 'constructs';
import { LambdaIntegration, RestApi, Cors } from 'aws-cdk-lib/aws-apigateway';

interface ApiGatewayResourcesProps {
    stockTable: Table;
}

export class GetHistoryDataLambdaResources extends Construct {
    public lambdaHandler: Function;
    public restApi: RestApi;

    constructor(scope: Construct, id: string, props: ApiGatewayResourcesProps) {
        super(scope, id);

        const lambdaHandlerRole = new Role(
            this,
            'getHistoryDataLambdaRole',
            {
                assumedBy: new ServicePrincipal('lambda.amazonaws.com'),
                managedPolicies: [
                    ManagedPolicy.fromAwsManagedPolicyName(
                        'service-role/AWSLambdaBasicExecutionRole',
                    ),
                ],
            },
        );

        this.lambdaHandler = new NodejsFunction(this, 'getHistoryDataLambdaHandler', {
            entry: 'lambda/getHistoryDataHandler.ts',
            runtime: Runtime.NODEJS_18_X,
            architecture: Architecture.ARM_64,
            timeout: Duration.seconds(10),
            role: lambdaHandlerRole,
            environment: {
                STOCK_TABLE: props.stockTable.tableName,
            },
        });

        props.stockTable.grantReadWriteData(this.lambdaHandler);

        const lamdbdaIntegration = new LambdaIntegration(this.lambdaHandler);

        this.restApi = new RestApi(this, 'historyDataApi', {
            restApiName: 'History Data Service',
            defaultCorsPreflightOptions: {
                allowOrigins: Cors.ALL_ORIGINS
            }
        });
        const items = this.restApi.root.addResource('{symbol}');
        items.addMethod('GET', lamdbdaIntegration);
    }
}