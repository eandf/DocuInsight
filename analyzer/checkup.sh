RED='\033[4;31m'
NC='\033[0m'

echo -e "${RED}➜  CURRENT STATE:${NC}\n" # header

uptime
date

echo -e "\n${RED}➜  PYTHON PROCESSES:${NC}\n" # header

{
	ps -fA | head -n 1
	ps -fA | grep "analyzer" | grep "sh"
} | awk '{printf "%-10s %-7s %-8s %s\n", $1, $2, $7, substr($0, index($0,$8))}'

if command -v pydf &>/dev/null; then
	echo -e "\n${RED}➜  TOTAL SYSTEM STORAGE:${NC}\n" # header
	pydf
fi

echo -e "\n${RED}➜  LAST LOGS & REAL ERRORS:${NC}\n" # header

grep -v 'INFO' /opt/workhub/DocuInsight/analyzer/analyzer.log | tail -n 1 | awk '{print $1, $2, $3, "- Real Error Date"}'
tail -n 1 /opt/workhub/DocuInsight/analyzer/analyzer.log
echo $(date +"%m-%d-%Y %H:%M:%S %Z")" - Current Local Date and Time"
