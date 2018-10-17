export StackName="minecraft-cluster"
#export region="us-east-1"
export region="ap-southeast-2"
export logGroupName=$StackName
export domainName="mc.bofh.net.au"
export repositoryName="minecraft"
export clusterConfig="minecraft"
aws configure set region $region
export AWS_REGION=$region
export AWS_DEFAULT_REGION=$region

[ -f ./ecs-cli ] || wget https://s3.amazonaws.com/amazon-ecs-cli/ecs-cli-linux-amd64-latest -O ./ecs-cli
[ -x ./ecs-cli ] || chmod +x ecs-cli
command -v awsmobile >/dev/null 2>&1 || npm install -g awsmobile-cli

export zoneID=$(aws route53 list-hosted-zones --query "HostedZones[?Name==\`$domainName.\`].Id" --output text | cut -d'/' -f3)
