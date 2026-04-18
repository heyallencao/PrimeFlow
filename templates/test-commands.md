# PrimeFlow Test Command Reference

> Skills that need framework-specific test commands should reference this file instead of inlining them.

## Python

| Action | Command |
|---|---|
| Run all tests | `pytest` |
| Run specific scenario | `pytest -k "scenario_name"` |
| Run with coverage | `pytest --cov --cov-report=term-missing` |
| Run specific file | `pytest tests/test_file.py` |
| Run with verbose output | `pytest -v` |

## Node / JavaScript

| Action | Command |
|---|---|
| Run all tests | `npm test` or `npx jest` |
| Run specific scenario | `npx jest --testNamePattern="scenario name"` |
| Run with coverage | `npx jest --coverage` |
| Run Playwright e2e | `npx playwright test` |
| Run tagged e2e | `npx playwright test --grep "[tag]"` |

## Java

| Action | Command |
|---|---|
| Run all tests (Gradle) | `./gradlew test` |
| Run specific class | `./gradlew test --tests "ClassName"` |
| Run with coverage | `./gradlew jacocoTestReport` |
| Run all tests (Maven) | `mvn test` |
| Run specific class | `mvn -Dtest=ClassName test` |

## Go

| Action | Command |
|---|---|
| Run all tests | `go test ./...` |
| Run with verbose | `go test -v ./...` |
| Run with coverage | `go test -cover ./...` |
| Run specific package | `go test ./pkg/...` |

## Shell (bats)

| Action | Command |
|---|---|
| Run all tests | `bats tests/` |
| Run specific file | `bats tests/case.bats` |

## Rust

| Action | Command |
|---|---|
| Run all tests | `cargo test` |
| Run specific test | `cargo test test_name` |
| Run with verbose | `cargo test -- --nocapture` |
