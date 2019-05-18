"""
Lambda Handler for the CloudTrailBucket macro.

This macro transforms a resource with type "CloudTrailBucket" into 
a bucket, a bucket policy, and a CloudTrail configuration that logs 
activity to that bucket.
"""

def lambda_handler(event, _):
    "Lambda handler function for the macro"

    print(event)

    # Get the template fragment, which is the entire 
    # starting template
    fragment = event['fragment']

    bucket_name = None

    # Look through resources to find one with type CloudTrailBucket
    for k, r in fragment['Resources'].items():
        if r['Type'] == 'CloudTrailBucket':
            r['Type'] = 'AWS::S3::Bucket'
            r['DeletionPolicy'] = 'Retain'
            bucket_name = k

    # Create the policy for the bucket
    bucket_policy = {
        "Type" : "AWS::S3::BucketPolicy",
        "Properties" : {
            "Bucket" : {"Ref" : bucket_name},
            "PolicyDocument" : {
                "Version": "2012-10-17",
                "Statement": [
                    {
                        "Sid": "AWSCloudTrailAclCheck",
                        "Effect": "Allow",
                        "Principal": { 
                            "Service":"cloudtrail.amazonaws.com"
                        },
                        "Action": "s3:GetBucketAcl",
                        "Resource": { 
                            "Fn::Join" : [
                                "", [
                                    "arn:aws:s3:::", {
                                        "Ref": bucket_name
                                    }
                                ]
                            ]
                        }
                    },
                    {
                        "Sid": "AWSCloudTrailWrite",
                        "Effect": "Allow",
                        "Principal": { 
                            "Service":"cloudtrail.amazonaws.com"
                            },
                        "Action": "s3:PutObject",
                        "Resource": { 
                            "Fn::Join" : [
                                "", [
                                    "arn:aws:s3:::", {
                                        "Ref": bucket_name
                                    }, 
                                    "/AWSLogs/", 
                                    {
                                        "Ref":"AWS::AccountId"
                                    }, "/*"
                                ]
                            ]
                        },
                        "Condition": {
                            "StringEquals": {
                                "s3:x-amz-acl": "bucket-owner-full-control"
                            }
                        }
                    }
                ]
            }
        }
    }

    if bucket_name:
        # Add the policy to the fragment
        fragment['Resources'][bucket_name + 'BucketPolicy'] = bucket_policy

        # Create the trail and add it to the fragment
        trail = {
            'DependsOn' : [bucket_name + 'BucketPolicy'],
            'Type' : 'AWS::CloudTrail::Trail',
            'Properties' : {
                'S3BucketName' : {'Ref': bucket_name},
                'IsLogging' : True
            }
        }
        fragment['Resources'][bucket_name + 'Trail'] = trail

    # Return the transformed fragment
    return {
        "requestId": event["requestId"],
        "status": "success",
        "fragment": fragment,
    }
    