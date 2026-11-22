.PHONY: up down build restart logs shell install build-web cap-sync

up:
	docker compose up -d

down:
	docker compose down

build:
	docker compose up -d --build

restart:
	docker compose restart

logs:
	docker compose logs -f web

shell:
	docker compose exec web sh

install:
	docker compose exec web npm install

build-web:
	docker compose exec web npm run build

cap-sync:
	docker compose exec web npm run build && docker compose exec web npx cap sync