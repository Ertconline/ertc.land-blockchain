## Инструкция:
1. [Установка](#установка)
1. [Запуск ноды](#запуск-ноды)
1. [Запуск сети](#запуск-сети)
1. [Запуск сети без сброса](#запуск-сети-без-сброса)
1. [Загрузка обновлений для ноды](#загрузка-обновлений-для-ноды)
1. [Загрузка обновлений для мастер-ноды](#загрузка-обновлений-для-мастер-ноды)

## Установка
Клонируем блокчейн [git clone](https://git-scm.com/book/en/v2/Git-Basics-Getting-a-Git-Repository "git clone") или скачиваем ZIP архив.

Для запуска ноды нужно установить docker & docker-compose ([windows](https://docs.docker.com/desktop/install/windows-install/ "windows"), [linux](https://docs.docker.com/desktop/install/linux-install/ "linux"), [MacOs](https://docs.docker.com/desktop/install/mac-install/)).

## Запуск ноды
1. `docker-compose up --build` | собираем ноду и запускаем
2. Ждем окончания синхронизации сети

## Запуск сети
1. `docker-compose f ./docker-compose-firstStart.yml up --build` | собираем ноду и запускаем

## Запуск сети без сброса
1. `docker-compose f ./docker-compose-reStart.yml up --build` | собираем ноду и запускаем

## Загрузка обновлений для ноды
1. `CTRL + C` или `CMD + C` | останавливаем ноду
2. Ждем полной остановки ноды
3. `git pull` | загружаем обновления
4. `docker-compose up --build` | запуск ноды с билдом

## Загрузка обновлений для мастер ноды
1. `CTRL + C` или `CMD + C` | останавливаем ноду
2. Ждем полной остановки ноды
3. `git pull` | загружаем обновления
4. `docker-compose f ./docker-compose-reStart up --build` | собираем ноду и запускаем
