---
name: feature-planner
description: Creates phase-based feature implementation plans with TDD workflow and quality gates. Use when planning features, breaking down development tasks, creating implementation roadmaps, or structuring coding work. Triggers on phrases like "plan this feature", "break down this task", "create implementation plan", "how should I implement", "organize this development work".
---

# Feature Planner

Generate structured, phase-based implementation plans where each phase delivers working functionality with TDD enforcement.

## Core Workflow

### 1. Requirements Analysis
- Read relevant codebase files to understand architecture
- Identify dependencies and integration points
- Assess complexity → determine scope (small: 2-3 phases, medium: 4-5, large: 6-7)

### 2. Phase Breakdown
Break feature into 3-7 phases. Each phase:
- Takes 1-4 hours maximum
- Delivers testable, working functionality
- Follows Red-Green-Refactor cycle
- Has measurable quality gates

**Phase Structure**:
```
Phase N: [Name]
├── Goal: What working functionality this produces
├── 🔴 RED: Write failing tests first
├── 🟢 GREEN: Implement minimal code to pass tests
├── 🔵 REFACTOR: Improve code quality
└── Quality Gate: Validation criteria before next phase
```

### 3. Get User Approval
**CRITICAL**: Ask user to confirm before creating plan document:
- "Does this phase breakdown make sense?"
- "Any concerns about the approach?"
- "Should I proceed with creating the plan?"

### 4. Generate Plan Document
Create `docs/plans/PLAN_<feature-name>.md` using the plan template below.

## Quality Gate Standards

Each phase validates before proceeding:
- [ ] Tests written BEFORE code (TDD compliance)
- [ ] All tests pass, coverage ≥80% for business logic
- [ ] Build/compile without errors
- [ ] Linting and type checking pass
- [ ] Manual testing confirms functionality
- [ ] No security vulnerabilities or performance regressions

## Phase Sizing

| Scope | Phases | Total Time | Example |
|-------|--------|------------|---------|
| Small | 2-3 | 3-6 hours | Dark mode toggle, new form component |
| Medium | 4-5 | 8-15 hours | Auth system, search functionality |
| Large | 6-7 | 15-25 hours | AI-powered search, real-time collaboration |

## TDD Cycle Reference

```
🔴 RED: Write test → Run → FAILS ❌ → Commit
🟢 GREEN: Minimal code → Run → PASSES ✅ → Commit
🔵 REFACTOR: Improve → Run → STILL PASSES ✅ → Commit
→ Repeat
```

---

# Plan Template

Use the following template when generating plan documents:

```markdown
# Implementation Plan: [Feature Name]

**Status**: 🔄 In Progress
**Started**: YYYY-MM-DD
**Last Updated**: YYYY-MM-DD
**Estimated Completion**: YYYY-MM-DD

---

**⚠️ CRITICAL INSTRUCTIONS**: After completing each phase:
1. ✅ Check off completed task checkboxes
2. 🧪 Run all quality gate validation commands
3. ⚠️ Verify ALL quality gate items pass
4. 📅 Update "Last Updated" date above
5. 📝 Document learnings in Notes section
6. ➡️ Only then proceed to next phase

⛔ **DO NOT skip quality gates or proceed with failing checks**

---

## 📋 Overview

### Feature Description
[What this feature does and why it's needed]

### Success Criteria
- [ ] Criterion 1
- [ ] Criterion 2
- [ ] Criterion 3

### User Impact
[How this benefits users or improves the product]

---

## 🏗️ Architecture Decisions

| Decision | Rationale | Trade-offs |
|----------|-----------|------------|
| [Decision 1] | [Why this approach] | [What we're giving up] |
| [Decision 2] | [Why this approach] | [What we're giving up] |

---

## 📦 Dependencies

### Required Before Starting
- [ ] Dependency 1: [Description]
- [ ] Dependency 2: [Description]

### External Dependencies
- Package/Library 1: version X.Y.Z
- Package/Library 2: version X.Y.Z

---

## 🧪 Test Strategy

### Testing Approach
**TDD Principle**: Write tests FIRST, then implement to make them pass

### Test Pyramid for This Feature
| Test Type | Coverage Target | Purpose |
|-----------|-----------------|---------|
| **Unit Tests** | ≥80% | Business logic, models, core algorithms |
| **Integration Tests** | Critical paths | Component interactions, data flow |
| **E2E Tests** | Key user flows | Full system behavior validation |

### Coverage Requirements by Phase
- **Phase 1 (Foundation)**: Unit tests for core models/entities (≥80%)
- **Phase 2 (Business Logic)**: Logic + repository tests (≥80%)
- **Phase 3 (Integration)**: Component integration tests (≥70%)
- **Phase 4 (E2E)**: End-to-end user flow test (1+ critical path)

---

## 🚀 Implementation Phases

### Phase 1: [Foundation Phase Name]
**Goal**: [Specific working functionality this phase delivers]
**Estimated Time**: X hours
**Status**: ⏳ Pending | 🔄 In Progress | ✅ Complete

#### Tasks

**🔴 RED: Write Failing Tests First**
- [ ] **Test 1.1**: Write unit tests for [specific functionality]
  - File(s): `test/unit/[feature]/[component]_test.*`
  - Expected: Tests FAIL (red) because feature doesn't exist yet

**🟢 GREEN: Implement to Make Tests Pass**
- [ ] **Task 1.2**: Implement [component/module]
  - File(s): `src/[layer]/[component].*`
  - Goal: Make Test 1.1 pass with minimal code

**🔵 REFACTOR: Clean Up Code**
- [ ] **Task 1.3**: Refactor for code quality
  - Checklist:
    - [ ] Remove duplication (DRY principle)
    - [ ] Improve naming clarity
    - [ ] Extract reusable components

#### Quality Gate ✋

**⚠️ STOP: Do NOT proceed to Phase 2 until ALL checks pass**

**TDD Compliance**:
- [ ] Tests were written FIRST and initially failed
- [ ] Production code written to make tests pass
- [ ] Code improved while tests still pass

**Build & Tests**:
- [ ] Project builds without errors
- [ ] All tests pass
- [ ] Test coverage meets requirements

**Code Quality**:
- [ ] No linting errors
- [ ] Code formatted per standards
- [ ] Type checker passes

---

### Phase 2: [Core Feature Phase Name]
**Goal**: [Specific deliverable]
**Estimated Time**: X hours
**Status**: ⏳ Pending

[Same structure as Phase 1]

---

### Phase 3: [Enhancement Phase Name]
**Goal**: [Specific deliverable]
**Estimated Time**: X hours
**Status**: ⏳ Pending

[Same structure as Phase 1]

---

## ⚠️ Risk Assessment

| Risk | Probability | Impact | Mitigation Strategy |
|------|-------------|--------|---------------------|
| [Risk 1] | Low/Med/High | Low/Med/High | [Mitigation steps] |

---

## 🔄 Rollback Strategy

### If Phase 1 Fails
- Undo code changes in: [list files]
- Restore configuration: [specific settings]

### If Phase 2 Fails
- Restore to Phase 1 complete state
- Undo changes in: [list files]

---

## 📊 Progress Tracking

### Completion Status
- **Phase 1**: ⏳ 0%
- **Phase 2**: ⏳ 0%
- **Phase 3**: ⏳ 0%

**Overall Progress**: 0% complete

### Time Tracking
| Phase | Estimated | Actual | Variance |
|-------|-----------|--------|----------|
| Phase 1 | X hours | - | - |
| Phase 2 | X hours | - | - |
| Phase 3 | X hours | - | - |

---

## 📝 Notes & Learnings

### Implementation Notes
- [Add insights discovered during implementation]

### Blockers Encountered
- **Blocker 1**: [Description] → [Resolution]

---

## ✅ Final Checklist

**Before marking plan as COMPLETE**:
- [ ] All phases completed with quality gates passed
- [ ] Full integration testing performed
- [ ] Documentation updated
- [ ] All stakeholders notified
```

---

## TDD Example Workflow

### Example: Adding User Authentication Feature

**Phase 1: RED (Write Failing Tests)**
```python
# test_auth_service.py
def test_should_validate_user_credentials():
    # Arrange
    auth_service = AuthService(mock_database)
    valid_credentials = {"username": "user", "password": "pass"}

    # Act
    result = auth_service.authenticate(valid_credentials)

    # Assert
    assert result.is_success == True
    assert result.user is not None
    # TEST FAILS - AuthService doesn't exist yet
```

**Phase 2: GREEN (Minimal Implementation)**
```python
# auth_service.py
class AuthService:
    def authenticate(self, credentials):
        # Minimal code to make test pass
        user = self.database.find_user(credentials["username"])
        if user and user.password == credentials["password"]:
            return Success(user)
        return Failure("Invalid credentials")
        # TEST PASSES - minimal functionality works
```

**Phase 3: REFACTOR (Improve Design)**
```python
class AuthService:
    def authenticate(self, credentials):
        # Add validation
        if not self._validate_credentials(credentials):
            return Failure("Invalid input")

        # Add error handling
        try:
            user = self.database.find_user(credentials["username"])

            # Use secure password comparison
            if user and self._secure_compare(user.password, credentials["password"]):
                return Success(user)

            return Failure("Invalid credentials")
        except DatabaseError as error:
            logger.error(error)
            return Failure("Authentication failed")
        # TESTS STILL PASS - improved code quality
```

### TDD Red-Green-Refactor Cycle

```
Phase 1: 🔴 RED
├── Write test for feature X
├── Run test → FAILS ❌
└── Commit: "Add failing test for X"

Phase 2: 🟢 GREEN
├── Write minimal code
├── Run test → PASSES ✅
└── Commit: "Implement X to pass tests"

Phase 3: 🔵 REFACTOR
├── Improve code quality
├── Run test → STILL PASSES ✅
└── Commit: "Refactor X for better design"

Repeat for next feature →
```
