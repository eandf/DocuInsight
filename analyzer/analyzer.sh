# Run the loop
while true; do
	source /opt/workhub/DocuInsight/analyzer/.env
	python3 /opt/workhub/DocuInsight/analyzer/main.py
	sleep $((RANDOM % 3 + 1)) # pause between 1 - 3 seconds
done
