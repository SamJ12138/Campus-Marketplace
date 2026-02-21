#!/usr/bin/env bash
# =============================================================================
# init.sh — Environment verification script for Gettysburg Community project
# Run this at the start of every autonomous agent session to verify health.
# =============================================================================

set -u

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
API_DIR="$PROJECT_ROOT/bulletin-board-api"
FRONTEND_DIR="$PROJECT_ROOT/bulletin-board-frontend"

# Convert Git Bash path to Windows path for Python compatibility
# /c/Users/... -> C:/Users/...
WIN_PROJECT_ROOT="$(echo "$PROJECT_ROOT" | sed 's|^/\([a-zA-Z]\)/|\1:/|')"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

PASS=0
FAIL=0
WARN=0

check_pass() { echo -e "  ${GREEN}[PASS]${NC} $1"; PASS=$((PASS + 1)); }
check_fail() { echo -e "  ${RED}[FAIL]${NC} $1"; FAIL=$((FAIL + 1)); }
check_warn() { echo -e "  ${YELLOW}[WARN]${NC} $1"; WARN=$((WARN + 1)); }

echo "============================================"
echo "  Gettysburg Community — Environment Check"
echo "  $(date '+%Y-%m-%d %H:%M:%S')"
echo "============================================"
echo ""

# --- 1. Directory Structure ---
echo ">> Directory Structure"
if [ -d "$API_DIR" ]; then check_pass "Backend directory exists"; else check_fail "Backend directory missing"; fi
if [ -d "$FRONTEND_DIR" ]; then check_pass "Frontend directory exists"; else check_fail "Frontend directory missing"; fi
if [ -f "$PROJECT_ROOT/CLAUDE.md" ]; then check_pass "CLAUDE.md exists"; else check_fail "CLAUDE.md missing"; fi
if [ -f "$PROJECT_ROOT/ai-automation/tasks.json" ]; then check_pass "tasks.json exists"; else check_fail "tasks.json missing"; fi
if [ -f "$PROJECT_ROOT/ai-automation/claude-progress.md" ]; then check_pass "Progress file exists"; else check_fail "Progress file missing"; fi
echo ""

# --- 2. Git Status ---
echo ">> Git Status"
cd "$PROJECT_ROOT"
if git rev-parse --is-inside-work-tree &>/dev/null; then
    check_pass "Git repository detected"
    BRANCH=$(git branch --show-current)
    echo "       Branch: $BRANCH"
    if git diff --quiet && git diff --cached --quiet; then
        check_pass "Working tree is clean"
    else
        check_warn "Working tree has uncommitted changes"
    fi
    LAST_COMMIT=$(git log -1 --format="%h %s" 2>/dev/null || echo "no commits")
    echo "       Last commit: $LAST_COMMIT"
else
    check_fail "Not a git repository"
fi
echo ""

# --- 3. Backend Dependencies ---
echo ">> Backend (Python)"
# Prefer 'python' on Windows (python3 is often the MS Store redirect)
PYTHON_CMD=""
if command -v python &>/dev/null && python --version &>/dev/null; then
    PYTHON_CMD="python"
elif command -v python3 &>/dev/null && python3 --version &>/dev/null; then
    PYTHON_CMD="python3"
fi

if [ -n "$PYTHON_CMD" ]; then
    PYTHON_VER=$($PYTHON_CMD --version 2>&1)
    check_pass "Python available: $PYTHON_VER"
else
    check_fail "Python not found"
fi

if [ -f "$API_DIR/requirements.txt" ]; then
    check_pass "requirements.txt exists"
else
    check_fail "requirements.txt missing"
fi
echo ""

# --- 4. Frontend Dependencies ---
echo ">> Frontend (Node.js)"
if command -v node &>/dev/null; then
    NODE_VER=$(node --version 2>&1)
    check_pass "Node.js available: $NODE_VER"
else
    check_fail "Node.js not found"
fi

if command -v npm &>/dev/null; then
    NPM_VER=$(npm --version 2>&1)
    check_pass "npm available: $NPM_VER"
else
    check_fail "npm not found"
fi

if [ -d "$FRONTEND_DIR/node_modules" ]; then
    check_pass "node_modules exists"
else
    check_warn "node_modules missing — run 'npm install' in bulletin-board-frontend/"
fi
echo ""

# --- 5. Task Status ---
echo ">> Task Status"
if [ -n "$PYTHON_CMD" ]; then
    TASK_SUMMARY=$($PYTHON_CMD -c "
import json, sys, os
tasks_path = os.path.join('${WIN_PROJECT_ROOT}', 'ai-automation', 'tasks.json')
try:
    with open(tasks_path, 'r', encoding='utf-8') as f:
        data = json.load(f)
    tasks = data['tasks']
    pending = sum(1 for t in tasks if t['status'] == 'pending')
    in_prog = sum(1 for t in tasks if t['status'] == 'in_progress')
    done = sum(1 for t in tasks if t['status'] == 'completed')
    total = len(tasks)
    print(f'Total: {total} | Pending: {pending} | In Progress: {in_prog} | Completed: {done}')
    for t in tasks:
        if t['status'] == 'pending':
            blocked = t.get('blockedBy', [])
            all_done = all(
                any(t2['id'] == bid and t2['status'] == 'completed' for t2 in tasks)
                for bid in blocked
            )
            if all_done:
                print(f'Next task: {t[\"id\"]} -- {t[\"title\"]}')
                break
except Exception as e:
    print(f'Error reading tasks: {e}')
    sys.exit(1)
" 2>&1)
    echo "       $(echo "$TASK_SUMMARY" | head -1)"
    NEXT_LINE=$(echo "$TASK_SUMMARY" | tail -1)
    if [ "$NEXT_LINE" != "$(echo "$TASK_SUMMARY" | head -1)" ]; then
        echo "       $NEXT_LINE"
    fi
    check_pass "Task file readable"
else
    check_warn "Cannot read task file (Python unavailable)"
fi
echo ""

# --- Summary ---
echo "============================================"
echo -e "  Results: ${GREEN}${PASS} passed${NC}, ${RED}${FAIL} failed${NC}, ${YELLOW}${WARN} warnings${NC}"
echo "============================================"

if [ "$FAIL" -gt 0 ]; then
    echo -e "${RED}Environment has failures. Fix before proceeding.${NC}"
    exit 1
else
    echo -e "${GREEN}Environment ready for autonomous development.${NC}"
    exit 0
fi
