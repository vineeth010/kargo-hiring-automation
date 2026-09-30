# Kargo CV Validation Rubric

## Purpose

Use the rubric to evaluate candidates for Kargo's Product Manager (PM)
and Senior Product Manager (SPM) roles.

The core principle is:

> **Historical Kargo-fit is the primary signal. Job Description (JD) fit
> is a secondary role-specific layer.**

The rubric is based on the seven positive calibration profiles: the five
past hires rated **Exceeds Expectations** and the two rated **Meets
Expectations**. The below-expectations hire is excluded from the
positive-pattern rubric.

The system should evaluate **evidence visible in the CV**, not infer
personality or intent without supporting evidence.

------------------------------------------------------------------------

# 1. Scoring Architecture

## Overall score: 100 points

### Layer 1 --- Historical Kargo-fit: 70 points

Measures whether the candidate resembles the characteristics repeatedly
visible in Kargo's successful hires.

  Criterion                                        Weight
  ---------------------------------------------- --------
  Ownership in ambiguity                               20
  Ground-level operational / customer exposure         15
  Problem → Action → Outcome                           15
  Learning & adaptation                                10
  Cross-functional execution                           10
  **Total**                                        **70**

### Layer 2 --- Role / JD fit: 30 points

Measures relevance to the specific PM or SPM role.

The system should not simply count keyword matches. It should assess the
relevance of the candidate's demonstrated experience to the role.

------------------------------------------------------------------------

# 2. Historical Kargo-fit Rubric

## 2.1 Ownership in Ambiguity --- 20 points

### What to look for

Evidence that the candidate:

-   Identified an important problem or opportunity independently.
-   Took responsibility without relying on an established playbook.
-   Built, changed, or drove something rather than only executing an
    assigned task.
-   Operated effectively when processes or structures were incomplete.

### Strong evidence

Examples where the CV clearly shows:

**Situation / gap → candidate took ownership → action → result**

### Weak evidence

Do not award strong points merely because the CV contains words such as:

-   Leadership
-   Ownership
-   Entrepreneurial
-   Strategic
-   Proactive

The claim needs supporting evidence.

------------------------------------------------------------------------

## 2.2 Ground-level Operational / Customer Exposure --- 15 points

### What to look for

Evidence of direct proximity to:

-   Customers
-   Users
-   Business operations
-   Operational workflows
-   Real-world problems being solved
-   The environment in which the product or service is used

For Kargo, logistics / supply-chain exposure is particularly relevant.

Do not reduce this criterion to simply:

> "Has worked in logistics."

The stronger signal is **direct understanding of the people, workflows,
and operational problems involved.**

------------------------------------------------------------------------

## 2.3 Problem → Action → Outcome --- 15 points

### What to look for

Evidence that the candidate can connect:

**Problem identified → action taken → outcome produced**

Strong evidence includes:

-   Measurable business results
-   Product adoption changes
-   Cost / revenue / efficiency impact
-   Process improvements
-   Concrete outcomes from an initiative

A responsibility statement without an outcome should receive less
credit.

Example pattern:

> Identified X → implemented Y → resulted in Z.

------------------------------------------------------------------------

## 2.4 Learning & Adaptation --- 10 points

### What to look for

Evidence that the candidate:

-   Changed direction based on data or feedback.
-   Learned from failure or an unsuccessful outcome.
-   Killed, changed, or redirected an initiative when evidence warranted
    it.
-   Improved a process after discovering a problem.

The goal is to identify a **learning loop**, not simply whether the
candidate has experienced failure.

------------------------------------------------------------------------

## 2.5 Cross-functional Execution --- 10 points

### What to look for

Evidence that the candidate can operate across functional boundaries.

Examples include working across:

-   Product
-   Engineering
-   Operations
-   Sales
-   Customers
-   Design
-   Marketing
-   Vendors / external partners

The important signal is not merely "stakeholder management."

Look for evidence that the candidate **translated between functions and
moved work forward across them.**

------------------------------------------------------------------------

# 3. Role / JD Fit --- 30 points

The historical Kargo-fit layer remains the primary signal.

The JD layer refines the ranking based on the specific role.

## Product Manager

Evaluate evidence for:

-   Relevant product-management experience
-   Customer discovery / user understanding
-   Product ownership
-   Ability to operate in ambiguous or early-stage environments
-   Logistics / supply-chain exposure
-   Evidence of shipping, learning, and changing direction when required

## Senior Product Manager

Evaluate evidence for:

-   Sufficient PM experience
-   Platform / integration / data-layer experience
-   Significant product decision-making
-   Ability to operate independently in ambiguity
-   Early-stage / build-from-scratch experience
-   Logistics / supply-chain exposure
-   Evidence of operating at greater scope

The exact weighting within the 30-point JD layer can be role-specific,
but it should remain subordinate to the historical Kargo-fit layer.

------------------------------------------------------------------------

# 4. Hard Requirements

Hard requirements sit **outside the 100-point score**.

Do not allow a high historical Kargo-fit score to compensate for a
fundamental eligibility failure.

Examples:

-   A fundamental experience requirement for the role.
-   A requirement that is explicitly mandatory in the JD.
-   Other clearly stated non-negotiable eligibility criteria.

The system should first determine:

**Eligible / Not eligible**

Then, for eligible candidates:

**Historical Kargo-fit (70) + JD fit (30)**

------------------------------------------------------------------------

# 5. Scoring Principles

## Evidence over inference

Score what can reasonably be supported by the CV.

Do not infer:

-   Personality
-   Motivation
-   Intelligence
-   Culture fit
-   Intent
-   Leadership ability

unless the CV provides concrete evidence relevant to the rubric.

## Do not use keyword matching as the scoring mechanism

For example:

> "Strong ownership and leadership skills"

is not equivalent to evidence of ownership.

The system should look for the underlying behaviour and outcomes.

## Do not require perfect JD matching

A candidate can have gaps against non-critical JD criteria while still
being a strong match for Kargo's historical successful-hire pattern.

The system should not behave like:

> "80% of JD keywords matched = good candidate."

Instead:

> "Does this candidate resemble Kargo's successful hires, and how
> relevant is that pattern to this specific role?"

## Preserve human judgment

The system recommends and explains.

**Arjun makes the final hiring decision.**

The AI should not make the hiring decision on his behalf.

------------------------------------------------------------------------

# 6. Expected AI Output

For every candidate, produce an interpretable evaluation.

## Candidate

`Candidate Name`

### Eligibility

-   Status: Eligible / Not eligible
-   Hard requirement issues: List any applicable issues

### Historical Kargo-fit

**Score: XX / 70**

#### Ownership in ambiguity --- XX / 20

-   Evidence from CV:
-   Reasoning:

#### Ground-level operational / customer exposure --- XX / 15

-   Evidence from CV:
-   Reasoning:

#### Problem → Action → Outcome --- XX / 15

-   Evidence from CV:
-   Reasoning:

#### Learning & adaptation --- XX / 10

-   Evidence from CV:
-   Reasoning:

#### Cross-functional execution --- XX / 10

-   Evidence from CV:
-   Reasoning:

### Role / JD fit

**Score: XX / 30**

-   Relevant experience:
-   Strong matches:
-   Relevant gaps:

### Overall

**Total: XX / 100**

### Why this candidate ranked here

Give a concise explanation connecting the score to the candidate's
evidence.

Focus particularly on whether the candidate resembles the historical
Kargo successful-hire pattern.

### Gaps / uncertainty

Identify important areas where:

-   Evidence is missing.
-   The CV is ambiguous.
-   The candidate does not appear to meet a non-hard JD preference.

Do not treat missing evidence as proof that the candidate lacks the
characteristic.

### Interview probes

Generate targeted questions based on the candidate's evidence and gaps.

Each probe should help Arjun validate an important signal behind the
ranking.

Example structure:

> **Probe:** Tell me about the time you had to solve \[specific
> problem\] without an established process.

The interview probes should be derived from the candidate's actual CV
and the rubric, not generic interview questions.

------------------------------------------------------------------------

# 7. Ranking Philosophy

The purpose of the ranking is to produce a shortlist Arjun can trust.

The ranking should answer:

1.  **Does this candidate resemble Kargo's successful hires?**
2.  **What evidence supports that conclusion?**
3.  **How relevant is that pattern to the PM or SPM role?**
4.  **What gaps or uncertainties remain?**
5.  **What should Arjun probe if he interviews them?**

The system should optimize for **explainable recommendation**, not
automated hiring.

------------------------------------------------------------------------

# 8. Important Limitation

This rubric is a **positive-pattern calibration rubric**, not a
statistically validated predictive model.

It is based on the seven selected positive historical outcomes.

Therefore:

-   A high score means the candidate resembles characteristics seen in
    those successful hires.
-   A low score means weaker evidence of resemblance.
-   The rubric should not claim that a low score predicts failure.
-   Absence of evidence in a CV should not automatically be treated as
    evidence of absence.

The below-expectations historical hire is intentionally excluded from
this positive-pattern rubric for the current design.
