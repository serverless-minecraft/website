#!/bin/bash

export region="ap-southeast-2"
aws configure set region $region
export AWS_REGION=$region
export AWS_DEFAULT_REGION=$region
export domainName="mc.bofh.net.au"

# aws s3api create-bucket --acl private --bucket $domainName || true
# aws s3api put-bucket-versioning --bucket $domainName --versioning-configuration Status=Enabled || true
# aws s3 website s3://$domainName/ --index-document index.html --error-document error.html
cd $domainName && npm run build && aws s3 sync ./build s3://$domainName/ --cache-control max-age=0

# Invalidating the index to be sure we're not caching - assumes one distribution
DISTRIBUTIONID=`aws cloudfront list-distributions --query 'DistributionList.Items[0].Id' --output text`
aws cloudfront create-invalidation --distribution-id $DISTRIBUTIONID --paths /index.html
