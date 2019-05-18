/**
 * This is a custom resource handler that creates an S3 bucket 
 * and then populates it with test data.
 */

var aws = require("aws-sdk");
var s3 = new aws.S3();

const SUCCESS = 'SUCCESS';
const FAILED = 'FAILED';
const KEY = 'test_data.csv';
 
exports.handler = function(event, context) {
 
    console.info('mycrlambda event', event);
    
    // When CloudFormation requests a delete, 
    // remove the object and the bucket. 
    if (event.RequestType == "Delete") {
        
        let params = {
            Bucket: event.ResourceProperties.BucketName, 
            Key: KEY
        };
        
        s3.deleteObject(params, function(err, data) {
            if (err) {
                console.log(err, err.stack);
                sendResponse(event, context, FAILED);
            } else {
                console.log('Deleted object', data);
                
                let params = {
                    Bucket: event.ResourceProperties.BucketName
                };
                
                s3.deleteBucket(params, function(err, data) {
                    if (err) {
                        console.log(err, err.stack);
                        sendResponse(event, context, FAILED);
                    } else {
                        console.log("Deleted bucket", data);
                        sendResponse(event, context, SUCCESS);
                    }
                });
            }
        });
        
        return;
    }
    
    if (event.RequestType == "Update") {
        
        // Nothing to do here
        
        sendResponse(event, context, SUCCESS);
        return;
    }
 
    var params = {
        Bucket: event.ResourceProperties.BucketName
    };
     
    s3.createBucket(params, function(err, data) {
        if (err) {
           console.log(err, err.stack); 
           sendResponse(event, context, FAILED, data);
        } else {
            console.log('Created bucket ' + 
                event.ResourceProperties.BucketName);
           
            // Now that we have created the bucket, 
            // populate it with test data
            params = {
               Body: '1,\"A\"\n2,\"B\"\n3,\"C\"', 
               Bucket: event.ResourceProperties.BucketName, 
               Key: KEY
            };
            
            s3.putObject(params, function(err, data) {
                if (err) {
                    console.log(err, err.stack); 
                    sendResponse(event, context, FAILED, data);
                } else {
                    console.log('Created object test_data.csv');
                    sendResponse(event, context, SUCCESS, data);
                }
            });
        }
    });
};


/**
 * Send a response to the signed URL provided by CloudFormation.
 */
function sendResponse(event, context, status, data) {
 
    var body = JSON.stringify({
        Status: status,
        Reason: "",
        PhysicalResourceId: context.logStreamName,
        StackId: event.StackId,
        RequestId: event.RequestId,
        LogicalResourceId: event.LogicalResourceId,
        Data: data
    });
 
    console.log("body:\n", body);
 
    var https = require("https");
    var url = require("url");
 
    var parsedUrl = url.parse(event.ResponseURL);
    var options = {
        hostname: parsedUrl.hostname,
        port: 443,
        path: parsedUrl.path,
        method: "PUT",
        headers: {
            "content-type": "",
            "content-length": body.length
        }
    };
 
    var request = https.request(options, function(response) {
        console.log("response.statusCode: " + 
            response.statusCode);
        console.log("response.headers: " + 
            JSON.stringify(response.headers));
        context.done();
    });
 
    request.on("error", function(error) {
        console.log("sendResponse Error:" + error);
        context.done();
    });
  
    request.write(body);
    request.end();
}
