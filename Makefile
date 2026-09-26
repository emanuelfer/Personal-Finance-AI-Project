.PHONY: start stop restart backup restore dev test lan gateway gateway-logs gateway-status

start:
	@./scripts/start.sh

stop:
	@./scripts/stop.sh

restart:
	@./scripts/stop.sh
	@./scripts/start.sh

backup:
	@./scripts/backup-db.sh

restore:
	@./scripts/restore-db.sh

dev:
	@./scripts/dev.sh

lan:
	@./scripts/lan-info.sh

gateway:
	@docker compose up -d kong

gateway-logs:
	@docker logs -f pf-kong

gateway-status:
	@curl -s http://localhost:8001/status | jq . || curl -s http://localhost:8001/status

test-gemini:
	@./scripts/test-gemini.sh $(KEY)


