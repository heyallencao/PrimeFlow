#!/usr/bin/env bash
set -euo pipefail

HANDOFF_ROOT="${HANDOFF_ROOT:-.primeflow/handoff}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PACKAGE_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"
PF_CLI=(node "$PACKAGE_ROOT/bin/primeflow.mjs")

usage() {
  cat <<'USAGE'
Usage:
  handoff_file.sh create [topic]    # create a handoff directory and handoff.md template, then print the handoff.md path
  handoff_file.sh latest            # print the latest handoff.md path
  handoff_file.sh resolve <id>      # print the handoff.md path for the given ID
  handoff_file.sh list [n]          # list the most recent n handoffs (default: 5)
USAGE
}

generate_id() {
  local ts
  local rand_a
  local rand_b
  ts="$(date '+%Y%m%d-%H%M')"
  rand_a=$((RANDOM & 65535))
  rand_b=$((RANDOM & 65535))
  printf '%s-%04x%04x' "$ts" "$rand_a" "$rand_b"
}

normalize_query() {
  local query="$1"
  query="${query#.}"
  query="${query//\[/\.}"
  query="${query//\]/}"
  printf '%s\n' "$query"
}

json_read() {
  local query="$1"
  local normalized
  local value

  if [ ! -f ".primeflow/state.json" ]; then
    return 0
  fi

  normalized="$(normalize_query "$query")"
  value="$("${PF_CLI[@]}" state get "$normalized" 2>/dev/null | tr -d '"')" || true
  if [ "$value" = "null" ]; then
    printf '%s\n' ""
    return 0
  fi
  printf '%s\n' "$value"
}

normalize_value() {
  local value="${1:-}"
  if [ -z "$value" ] || [ "$value" = "null" ]; then
    printf '%s\n' "not recorded"
  else
    printf '%s\n' "$value"
  fi
}

next_routing_from_state() {
  local stage
  stage="$(json_read '.current_stage')"
  case "$stage" in
    ""|null|init)
      printf '%s\n' "roundtable"
      ;;
    *)
      printf '%s\n' "$stage"
      ;;
  esac
}

pending_from_state() {
  local blocker
  blocker="$(json_read '.blockers[0]')"
  if [ -n "$blocker" ]; then
    printf '%s\n' "$blocker"
  else
    printf '%s\n' "none"
  fi
}

constraints_from_state() {
  local risk
  local skipped
  local constraints=()

  risk="$(json_read '.risk_level')"
  [ -n "$risk" ] && constraints+=("risk level: $risk")

  skipped="$(json_read '.skipped_skills[0]')"
  [ -n "$skipped" ] && constraints+=("skipped skills: $skipped")

  if [ "${#constraints[@]}" -eq 0 ]; then
    printf '%s\n' "- not recorded"
    return
  fi

  for item in "${constraints[@]}"; do
    printf -- '- %s\n' "$item"
  done
}

completed_from_state() {
  local decision
  local plan_doc
  local test_doc
  local review_doc
  local output=()

  decision="$(json_read '.last_decision')"
  plan_doc="$(json_read '.artifacts.plan_document')"
  test_doc="$(json_read '.artifacts.test_contract')"
  review_doc="$(json_read '.artifacts.review_report')"

  [ -n "$decision" ] && output+=("latest decision: $decision")
  [ -n "$plan_doc" ] && output+=("plan document exists: $plan_doc")
  [ -n "$test_doc" ] && output+=("test contract exists: $test_doc")
  [ -n "$review_doc" ] && output+=("review report exists: $review_doc")

  if [ "${#output[@]}" -eq 0 ]; then
    printf '%s\n' "- not recorded"
    return
  fi

  for item in "${output[@]}"; do
    printf -- '- %s\n' "$item"
  done
}

key_files_from_state() {
  local files=()
  local path

  for query in '.artifacts.plan_document' '.artifacts.test_contract' '.artifacts.review_report' '.artifacts.knowledge_doc'; do
    path="$(json_read "$query")"
    if [ -n "$path" ]; then
      files+=("- \`${path}:1\`: current handoff-related document")
    fi
  done

  while IFS= read -r path; do
    [ -n "$path" ] || continue
    files+=("- \`${path}:1\`: file with current workspace changes")
  done < <(git diff --name-only 2>/dev/null | head -3)

  if [ "${#files[@]}" -eq 0 ]; then
    printf '%s\n' "- not recorded"
    return
  fi

  printf '%s\n' "${files[@]}"
}

next_step_from_state() {
  local route
  local block
  route="$(next_routing_from_state)"
  block="$(json_read '.current_block')"

  case "$route" in
    roundtable) printf '%s\n' "Resume at roundtable and continue converging the direction." ;;
    writing-plan) printf '%s\n' "Resume at writing-plan and finish the current block scope and done criteria." ;;
    test-first) printf '%s\n' "Resume at test-first and lock the behavior boundary for the current block." ;;
    implement) printf '%s\n' "Resume at implement and continue the current block${block:+: $block}." ;;
    verify) printf '%s\n' "Resume at verify and collect the fresh evidence for the current claim." ;;
    review) printf '%s\n' "Resume at review and perform the formal quality gate from verify evidence." ;;
    qa) printf '%s\n' "Resume at qa and continue real runtime validation." ;;
    ship) printf '%s\n' "Resume at ship and continue delivery or canary validation." ;;
    release) printf '%s\n' "Resume at release and complete honest closeout and risk disclosure." ;;
    knowledge) printf '%s\n' "Resume at knowledge and capture reusable learnings from this round." ;;
    diagnose) printf '%s\n' "Resume at diagnose and continue root-cause investigation." ;;
    *) printf '%s\n' "Resume at $route and continue the current work." ;;
  esac
}

get_session_id() {
  json_read '.session_id'
}

list_handoff_dirs() {
  local n="$1"
  local dirs=()

  [ -d "$HANDOFF_ROOT" ] || return 1

  shopt -s nullglob
  dirs=("$HANDOFF_ROOT"/*/)
  shopt -u nullglob

  [ "${#dirs[@]}" -gt 0 ] || return 1
  printf '%s\n' "${dirs[@]}" | sort -r | head -n "$n"
}

create_template() {
  local target_file="$1"
  local topic="$2"
  local handoff_id="$3"
  local session_id="$4"
  local timestamp="$5"
  local current_task
  local current_stage
  local last_skill
  local last_decision
  local pending
  local completed
  local constraints
  local key_files
  local next_step

  current_task="$(json_read '.current_block')"
  current_task="$(normalize_value "${current_task:-$topic}")"
  current_stage="$(normalize_value "$(json_read '.current_stage')")"
  last_skill="$(normalize_value "$(json_read '.last_skill')")"
  last_decision="$(normalize_value "$(json_read '.last_decision')")"
  pending="$(pending_from_state)"
  completed="$(completed_from_state)"
  constraints="$(constraints_from_state)"
  key_files="$(key_files_from_state)"
  next_step="$(next_step_from_state)"

  cat > "$target_file" <<DOC
# Handoff: $topic

- Time: $timestamp
- Handoff ID: $handoff_id
- Session ID: ${session_id:-N/A}

## Current Task
- $current_task

## Current Status
- Current stage: $current_stage
- Last skill: $last_skill

## Completed Work
$completed

## Key Decisions
- $last_decision

## Key Constraints
$constraints

## Key Files
$key_files

## Next Step
- $next_step

## Pending Confirmation
- $pending
DOC
}

mode="${1:-}"
[ -n "$mode" ] || { usage; exit 1; }
shift || true

case "$mode" in
  create)
    topic="${1:-handoff}"
    handoff_id="$(generate_id)"
    session_id="$(get_session_id)"
    timestamp="$(date '+%Y-%m-%d %H:%M')"
    safe_topic="$(printf '%s' "$topic" | tr '\n' ' ' | sed 's/[[:space:]]\+/ /g')"
    target_dir="$HANDOFF_ROOT/$handoff_id"

    mkdir -p "$target_dir"
    create_template "$target_dir/handoff.md" "$safe_topic" "$handoff_id" "$session_id" "$timestamp"
    printf '%s\n' "$target_dir/handoff.md"
    ;;

  latest)
    latest_dir="$(list_handoff_dirs 1 || true)"
    latest_dir="$(printf '%s\n' "$latest_dir" | head -n 1)"
    if [ -z "$latest_dir" ] || [ ! -f "${latest_dir}handoff.md" ]; then
      echo "No handoff found." >&2
      exit 1
    fi
    printf '%s\n' "${latest_dir}handoff.md"
    ;;

  resolve)
    id="${1:-}"
    [ -n "$id" ] || { echo "Usage: handoff_file.sh resolve <handoff_id>" >&2; exit 1; }
    target="$HANDOFF_ROOT/$id/handoff.md"
    [ -f "$target" ] || { echo "Handoff not found: $id" >&2; exit 1; }
    printf '%s\n' "$target"
    ;;

  list)
    n="${1:-5}"
    handoff_dirs="$(list_handoff_dirs "$n" || true)"

    if [ -z "$handoff_dirs" ]; then
      echo "No handoff found." >&2
      exit 1
    fi

    printf '%s\n' "$handoff_dirs" | while read -r dir; do
      [ -n "$dir" ] || continue
      dir_name="$(basename "$dir")"
      title="$(head -n 1 "$dir/handoff.md" 2>/dev/null | sed 's/^# Handoff: //' || echo "unknown")"
      printf '%s  %s\n' "$dir_name" "$title"
    done
    ;;

  *)
    usage
    exit 1
    ;;
esac
