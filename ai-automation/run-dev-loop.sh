#!/usr/bin/env bash
# =============================================================================
# run-dev-loop.sh — Autonomous Claude Code development loop
#
# Usage:
#   ./ai-automation/run-dev-loop.sh <number_of_iterations>
#
# Example:
#   ./ai-automation/run-dev-loop.sh 5    # Run 5 development cycles
#
# Each iteration:
#   1. Calls Claude Code with a fixed prompt to pick up the next task
#   2. Claude reads progress files, selects a task, implements it, commits
#   3. Logs are saved per-iteration for review
#
# Requires: claude CLI installed and authenticated
# =============================================================================

set -uo pipefail

# ── Configuration ─────────────────────────────────────────────────────────────

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
LOG_DIR="$PROJECT_ROOT/ai-automation/logs"
TASKS_FILE="$PROJECT_ROOT/ai-automation/tasks.json"
TIMESTAMP_START=$(date '+%Y%m%d_%H%M%S')

# Convert Git Bash path to Windows path for Python compatibility
WIN_TASKS_FILE="$(echo "$TASKS_FILE" | sed 's|^/\([a-zA-Z]\)/|\1:/|')"

# Detect Python command (prefer 'python' on Windows)
PYTHON_CMD=""
if command -v python &>/dev/null && python --version &>/dev/null; then
    PYTHON_CMD="python"
elif command -v python3 &>/dev/null && python3 --version &>/dev/null; then
    PYTHON_CMD="python3"
fi

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

# ── Validation ────────────────────────────────────────────────────────────────

if [ $# -lt 1 ]; then
    echo -e "${RED}Error: Missing required argument.${NC}"
    echo ""
    echo "Usage: $0 <number_of_iterations>"
    echo "  number_of_iterations  How many development cycles to run (1-50)"
    echo ""
    echo "Example: $0 5"
    exit 1
fi

ITERATIONS=$1

if ! [[ "$ITERATIONS" =~ ^[0-9]+$ ]] || [ "$ITERATIONS" -lt 1 ] || [ "$ITERATIONS" -gt 50 ]; then
    echo -e "${RED}Error: Iterations must be a number between 1 and 50.${NC}"
    exit 1
fi

# Check claude CLI is available
if ! command -v claude &>/dev/null; then
    echo -e "${RED}Error: 'claude' CLI not found. Install Claude Code first.${NC}"
    echo "  See: https://docs.anthropic.com/en/docs/claude-code"
    exit 1
fi

# ── Setup ─────────────────────────────────────────────────────────────────────

mkdir -p "$LOG_DIR"

# The prompt that each Claude session receives
AGENT_PROMPT='You are an autonomous development agent working on the Gettysburg Community (GimmeDat) project.

## YOUR MISSION
Complete exactly ONE task from the task list, then stop.

## MANDATORY STARTUP SEQUENCE (do these steps in order, do NOT skip any):
1. Run: pwd
2. Read the file: ai-automation/claude-progress.md (understand what previous sessions accomplished)
3. Read the file: ai-automation/tasks.json (find the next available task)
4. Run: bash ai-automation/init.sh (verify environment health)
5. Identify the FIRST task where status="pending" and all blockedBy tasks have status="completed"
6. If no task is available (all blocked or completed), update claude-progress.md noting this, then stop

## IMPLEMENTATION SEQUENCE:
7. Update the chosen task status to "in_progress" in ai-automation/tasks.json
8. Read ALL files listed in the task estimatedFiles that already exist
9. Read any other relevant source files you need to understand before making changes
10. Implement the task following the steps listed in the task definition
11. Run backend tests: cd bulletin-board-api && python -m pytest tests/ -x -q
12. Run backend linting: cd bulletin-board-api && ruff check .
13. Fix any test failures or lint errors before proceeding

## MANDATORY COMPLETION SEQUENCE:
14. Update the task status to "completed" in ai-automation/tasks.json
15. Append a detailed session entry to ai-automation/claude-progress.md with:
    - Current date/time
    - Task ID and title
    - Summary of what was implemented
    - List of files created or modified
    - Test results
    - Any issues or notes for the next session
16. Stage all changed files with git add (specific files, not -A)
17. Create a git commit with a descriptive message summarizing the task
18. Verify with git status that the working tree is clean

## RULES:
- Work on exactly ONE task per session
- Never skip reading progress and task files
- Always run tests before committing
- Never force push or amend existing commits
- Do not modify CLAUDE.md
- Leave the codebase in a clean, working state
- If you encounter an error you cannot resolve, document it in claude-progress.md and stop'

# ── Helper: read task status via Python ───────────────────────────────────────

print_task_status() {
    local mode="${1:-full}"  # "full" or "summary"
    if [ -z "$PYTHON_CMD" ]; then
        echo "  (Python unavailable — cannot read task status)"
        return
    fi
    $PYTHON_CMD -c "
import json, os
tasks_path = '${WIN_TASKS_FILE}'
with open(tasks_path, 'r', encoding='utf-8') as f:
    data = json.load(f)
tasks = data['tasks']
if '${mode}' == 'full':
    for t in tasks:
        status = t['status']
        icon = '[  ]' if status == 'pending' else ('[>>]' if status == 'in_progress' else '[OK]')
        blocked = ''
        if t.get('blockedBy'):
            unresolved = [b for b in t['blockedBy'] if not any(t2['id']==b and t2['status']=='completed' for t2 in tasks)]
            if unresolved:
                blocked = f' [BLOCKED by: {\", \".join(unresolved)}]'
        print(f'  {icon} {t[\"id\"]}: {t[\"title\"]} ({status}){blocked}')
completed = sum(1 for t in tasks if t['status'] == 'completed')
total = len(tasks)
pending = [t for t in tasks if t['status'] != 'completed']
print(f'')
print(f'  Progress: {completed}/{total} tasks completed ({int(completed/total*100) if total > 0 else 0}%)')
print(f'  Remaining: {len(pending)}')
" 2>/dev/null || echo "  (Could not read task status)"
}

# ── Banner ────────────────────────────────────────────────────────────────────

echo ""
echo -e "${BOLD}${CYAN}=======================================================${NC}"
echo -e "${BOLD}${CYAN}   GimmeDat -- Autonomous AI Development Loop${NC}"
echo -e "${BOLD}${CYAN}=======================================================${NC}"
echo ""
echo -e "  ${BOLD}Project:${NC}    $PROJECT_ROOT"
echo -e "  ${BOLD}Iterations:${NC} $ITERATIONS"
echo -e "  ${BOLD}Log dir:${NC}    $LOG_DIR"
echo -e "  ${BOLD}Started:${NC}    $(date '+%Y-%m-%d %H:%M:%S')"
echo ""

# Show current task status
echo -e "${BLUE}-- Current Task Status --${NC}"
print_task_status "full"
echo ""
echo -e "${BLUE}-------------------------${NC}"
echo ""

# ── Main Loop ─────────────────────────────────────────────────────────────────

SUCCEEDED=0
FAILED=0

for (( i=1; i<=ITERATIONS; i++ )); do
    ITER_TIMESTAMP=$(date '+%Y%m%d_%H%M%S')
    LOG_FILE="$LOG_DIR/iteration_${i}_${ITER_TIMESTAMP}.log"

    echo -e "${BOLD}${CYAN}+---------------------------------------------+${NC}"
    echo -e "${BOLD}${CYAN}|  Iteration $i / $ITERATIONS${NC}"
    echo -e "${BOLD}${CYAN}|  $(date '+%Y-%m-%d %H:%M:%S')${NC}"
    echo -e "${BOLD}${CYAN}+---------------------------------------------+${NC}"
    echo ""

    # Check if all tasks are completed before starting
    if [ -n "$PYTHON_CMD" ]; then
        REMAINING=$($PYTHON_CMD -c "
import json
tasks_path = '${WIN_TASKS_FILE}'
with open(tasks_path, 'r', encoding='utf-8') as f:
    data = json.load(f)
tasks = data['tasks']
pending = [t for t in tasks if t['status'] != 'completed']
print(len(pending))
" 2>/dev/null || echo "unknown")

        if [ "$REMAINING" = "0" ]; then
            echo -e "${GREEN}All tasks are completed! No more work to do.${NC}"
            break
        fi
        echo -e "  ${YELLOW}Remaining tasks: $REMAINING${NC}"
    fi
    echo -e "  ${BLUE}Log file: $LOG_FILE${NC}"
    echo ""

    # Run Claude Code
    echo -e "  ${CYAN}Launching Claude Code...${NC}"
    echo -e "  ${CYAN}───────────────────────────────────────────${NC}"
    ITER_START=$(date +%s)

    set +e
    claude -p "$AGENT_PROMPT" \
        --dangerously-skip-permissions \
        --output-format text \
        --verbose \
        -d "$PROJECT_ROOT" \
        2>&1 | tee "$LOG_FILE"
    EXIT_CODE=${PIPESTATUS[0]}
    set -e

    ITER_END=$(date +%s)
    ITER_DURATION=$(( ITER_END - ITER_START ))
    ITER_MINUTES=$(( ITER_DURATION / 60 ))
    ITER_SECONDS=$(( ITER_DURATION % 60 ))

    echo ""
    echo -e "  ${CYAN}───────────────────────────────────────────${NC}"
    if [ "$EXIT_CODE" -eq 0 ]; then
        echo -e "  ${GREEN}[OK] Iteration $i completed successfully (${ITER_MINUTES}m ${ITER_SECONDS}s)${NC}"
        SUCCEEDED=$((SUCCEEDED + 1))
    else
        echo -e "  ${RED}[FAIL] Iteration $i failed with exit code $EXIT_CODE (${ITER_MINUTES}m ${ITER_SECONDS}s)${NC}"
        FAILED=$((FAILED + 1))
    fi

    # Show git log of what was committed this iteration
    echo ""
    echo -e "  ${BLUE}Latest commits:${NC}"
    cd "$PROJECT_ROOT"
    git log --oneline -3 2>/dev/null | while IFS= read -r line; do echo "    $line"; done
    echo ""

    # Brief pause between iterations to avoid rate limiting
    if [ "$i" -lt "$ITERATIONS" ]; then
        echo -e "  ${YELLOW}Pausing 10 seconds before next iteration...${NC}"
        sleep 10
    fi

    echo ""
done

# ── Summary ───────────────────────────────────────────────────────────────────

TOTAL_END=$(date +%s)

echo ""
echo -e "${BOLD}${CYAN}=======================================================${NC}"
echo -e "${BOLD}${CYAN}   Development Loop Complete${NC}"
echo -e "${BOLD}${CYAN}=======================================================${NC}"
echo ""
echo -e "  ${BOLD}Finished:${NC}    $(date '+%Y-%m-%d %H:%M:%S')"
echo -e "  ${BOLD}Iterations:${NC}  $ITERATIONS total"
echo -e "  ${GREEN}  Succeeded:${NC} $SUCCEEDED"
echo -e "  ${RED}  Failed:${NC}    $FAILED"
echo -e "  ${BOLD}Logs:${NC}        $LOG_DIR/"
echo ""

# Final task status
echo -e "${BLUE}-- Final Task Status --${NC}"
print_task_status "full"
echo ""

if [ "$FAILED" -gt 0 ]; then
    echo -e "${YELLOW}Some iterations failed. Check logs at: $LOG_DIR/${NC}"
    exit 1
fi

exit 0
