# PROJECT CONTEXT & PRODUCT DISCOVERY HANDOFF

## Tinder for Hackathon Teammates — Complete Founder Vision

Claude, I want you to understand this project from its very beginning. This document contains my original idea, the problem I'm trying to solve, my current vision, product discussions, proposed features, decisions, uncertainties and long-term goals.

**Your first responsibility is to understand the product, not to start building it.**

I am still in the product discovery and planning phase. I don't have complete clarity about every feature, interaction or workflow. I want to explore the idea deeply, challenge assumptions, identify weaknesses and develop a well-thought-out product before writing code.

Do not rush me into development.

---

# 1. THE ORIGINAL IDEA — WHY I STARTED THINKING ABOUT THIS

The idea originated from a problem I repeatedly noticed during hackathons, especially external hackathons.

Whenever a hackathon is announced, most students immediately approach their existing friends or classmates to form a team.

We repeatedly end up working with the same people.

There are several problems with this:

- We work with the same group of people for almost every hackathon.
- We often have similar technical backgrounds, interests and ways of thinking.
- Sometimes, we form teams simply because our friends are available.
- Friends sometimes participate casually, whereas some members genuinely want to build something competitive.
- Finding people with complementary skills outside our existing circles is difficult.
- A talented student from another college might be looking for exactly the skills we possess, but there is no easy way for us to discover each other.

For example:

An AI/ML developer might need a full-stack developer, a UI/UX designer and someone with product or business knowledge.

However, that AI/ML developer might only know people from their own college or friend circle.

Similarly, an excellent UI/UX designer from another college might be looking for an AI/ML team to join.

Both could benefit from working together, but they might never meet.

**The fundamental problem is that students are restricted by their existing networks when searching for hackathon teammates.**

I want to solve this.

I want students to discover entirely new people, different perspectives, complementary technical skills and genuinely motivated collaborators.

The goal is not simply to help people find friends. It is to help them find people who can contribute meaningfully to building something.

# 2. THE SIMPLEST WAY TO DESCRIBE THE PRODUCT

Think of:

**Tinder + LinkedIn + Hackathon Team Formation.**

The main interaction is inspired by Tinder.

- Swipe right: Show interest and send a request.
- Swipe left: Skip the profile.
- Accepted request: Establish a connection.
- Connected users: Can communicate and explore collaboration.

However, this is not merely a Tinder clone.

The actual product is a student networking and hackathon collaboration platform.

The Tinder-like interaction is the primary discovery mechanism.

The platform should help students discover people based on their skills, projects, experience, interests, collaboration preferences and credibility.

# 3. TARGET AUDIENCE AND GEOGRAPHICAL DIRECTION

My initial target audience is B.Tech and engineering students.

However, I don't want to restrict the platform exclusively to developers or Computer Science students.

Students from different backgrounds can contribute to hackathons:

- Computer Science
- Information Technology
- AI/ML
- Cybersecurity
- Electronics
- Mechanical engineering
- Design
- Business and management
- Other relevant disciplines

I want to attract people with different skills and perspectives.

**Geographical strategy:**

- Long-term geographical ambition: Students across India and eventually worldwide.
- Initial launch strategy: Hyderabad colleges.
- Long-term vision: A global network of students who collaborate on hackathons.



# 4. THE TWO FUNDAMENTAL DISCOVERY EXPERIENCES

This is one of the most important aspects of the product.

Initially, I was thinking about individual-to-individual discovery.

But while discussing the product, I identified another important use case: individual-to-existing-team discovery.

Therefore, the platform should eventually have two primary discovery experiences.

## A. Discover Individual Students

A student who does not have a team can discover other individual students.

The experience should be similar to Tinder.

A student sees one profile at a time.

The profile provides enough information to understand:

- Who the person is.
- What they can contribute.
- Their technical and non-technical skills.
- Their previous hackathon experience.
- Their projects and achievements.
- Their interests.
- Their collaboration preferences.

The student can express interest by swiping right or using an equivalent interaction.

Swiping left simply skips the person.

If a request is sent, the recipient can accept or reject it.

Once accepted, both students become connected and can communicate.

## B. Discover Existing Teams

This is a particularly important feature.

Consider this scenario:

Three students have already formed a team for an upcoming external hackathon.

They need one more member, preferably someone with AI/ML or computer vision skills.

Currently, those three students can individually use the people-discovery feature to find potential teammates.

However, there is another type of student:

Someone who doesn't have a team but actively wants to join an already established team.

I want to support this use case separately.

There should be a dedicated **Teams** discovery section.

This section should display existing teams that are actively recruiting additional members.

A team listing should contain:

1. Team name.
2. Current team members.
3. Profiles and skills of existing members.
4. The hackathon they are participating in.
5. Hackathon description and problem statement.
6. Their project idea, if available.
7. The number of available positions.
8. The specific role or skill they need.
9. Required or preferred technical skills.
10. Team recruitment status.
11. Collaboration expectations.

For example:

TEAM NEXUS

Participating in: Smart India Hackathon

Current members:

- Member 1: AI/ML developer.
- Member 2: Backend developer.
- Member 3: Frontend developer.

Looking for:

- Computer Vision / ML Engineer.

Required skills:

- Python
- OpenCV
- Machine Learning

Positions available: 1

Recruitment status: Open.

A student can browse these teams, inspect their members, understand what they are building and send a request to join.

I haven't finalized the interaction design for this.

It might be:

- A dedicated team card with a Request to Join button.
- A swipe-based interaction.
- Some other interaction that works better for teams.

I want to explore this with you.

**Do not blindly copy Tinder's swiping interaction for team discovery. Evaluate what is actually best for this use case.**

# 5. TEAM-TO-INDIVIDUAL DISCOVERY

There is another workflow worth considering.

Suppose an existing team needs an additional member.

They should potentially be able to discover individual students and send invitations directly.

Therefore, the product may eventually support:

1. Individual → Individual.
2. Individual → Existing Team.
3. Existing Team → Individual.
4. Potentially Team → Team in the future.

The first three are the important scenarios to explore.

Team-to-team discovery is not yet a confirmed requirement.

# 6. REGISTRATION AND ACCOUNT CREATION

My current opinion is that both email address and phone number should be compulsory.

My reasoning:

If registration requires only an email address, one person can easily create two or three accounts using different email addresses.

Compulsory phone number verification increases the difficulty of creating multiple accounts.

My initial preference:

- Email address is mandatory.
- Phone number is mandatory.
- Email verification.
- Phone OTP verification.
- Duplicate phone numbers should not be allowed across active accounts.

However, I understand that phone verification does not make duplicate accounts completely impossible because people can own multiple phone numbers.

I want to discuss better identity verification and duplicate-account prevention mechanisms.

Phone numbers should remain private by default.

Registration methods, password requirements, account recovery and student verification are not finalized.

# 7. STUDENT PROFILES

Profiles are one of the most important components of the platform.

I want students to have meaningful profiles, somewhat inspired by LinkedIn.

The profile should help other students evaluate whether someone would be a suitable teammate.

## Information I currently consider important

### Basic information

- Name.
- Profile photo.
- College.
- Branch or department.
- Year of study.
- Location.

### Skills

- Technical skills.
- Non-technical skills.
- Areas of expertise.
- Preferred roles.

### GitHub

I want students to connect their GitHub accounts.

GitHub integration is part of my original idea.

It can help showcase repositories, projects and development activity.

### LinkedIn

I originally considered allowing students to connect their LinkedIn accounts as well.

### Previous hackathons

THIS IS EXTREMELY IMPORTANT.

I don't want the profile to display only hackathons conducted through my platform.

Students must be able to showcase hackathons they participated in before joining the platform.

For example:

- Smart India Hackathon.
- National-level hackathons.
- College-level hackathons.
- External hackathons.
- Other technical competitions.

They should be able to mention their role, team, contribution and achievements.

### Achievements

Examples:

- Winner.
- Runner-up.
- Finalist.
- Shortlisted.
- Participant.

I want to distinguish between self-reported achievements and independently verified achievements.

### Projects

Students should be able to showcase previous projects with:

- Project name.
- Description.
- Technologies used.
- Their individual contribution.
- GitHub repository.
- Live deployment or portfolio link.

### Collaboration history

This is another major feature.

Profiles should eventually display previous teammates, collaboration history and reviews.

The idea is to make the platform more meaningful than a collection of self-reported skills.

# 8. SWIPING AND REQUEST MANAGEMENT

My current preferred discovery experience is:

- One individual profile at a time.
- Buttons rather than relying exclusively on swipe gestures.

I selected the button-based single-profile experience in the initial questionnaire.

However, I am open to exploring gesture support as well.

## When someone shows interest

A right swipe or equivalent action sends a request.

The sender should be able to track that request's status.

Possible statuses:

- Request Pending.
- Request Accepted.
- Request Rejected.
- Request Cancelled.

There should be a dedicated Requests section.

It should ideally contain:

**Sent Requests**

- Requests sent to other students.
- Pending status.
- Accepted status.
- Rejected status.
- Cancelled status.

**Received Requests**

- Requests received from other students.
- Accept.
- Reject.

The sender should be able to understand what happened to their request without guessing.

Once accepted, the two users can start messaging.

## When someone skips a profile

Swiping left should simply ignore that person.

No request should be sent.

The skipped person should not receive a notification.

Whether skipped profiles should reappear later is still undecided.

# 9. TEAM CREATION AND RECRUITMENT

I want existing teams to be able to recruit members.

A team should be able to:

- Create a team.
- Add existing members.
- Associate the team with a particular hackathon.
- Explain what they are building.
- Specify which roles are required.
- Mention required skills.
- Specify available positions.
- Update recruitment status.

Possible recruitment statuses:

- Open.
- Partially filled.
- Full.
- Closed.

An individual should be able to request to join a team.

I also want to explore whether the team creator, team leader or designated team admin should manage recruitment approvals.

Team creation, permissions, member removal, multiple hackathons and team lifecycle rules have not been finalized.

# 10. MESSAGING

I want two types of messaging.

### A. Individual messaging

Two individual students can communicate only after their connection request has been accepted.

No accepted connection means no direct messaging.

### B. Group messaging

Teams should have group conversations.

A student who successfully joins a team should be able to participate in that team's group chat.

Messaging is intended to facilitate collaboration.

I don't necessarily want to build a complete Discord competitor.

Features to evaluate:

- Direct messages.
- Group chats.
- Notifications.
- Unread message indicators.
- Basic link sharing.
- Block and report.
- Leave team.
- Remove member permissions.

The exact messaging feature set is undecided.

# 11. COLLABORATION HISTORY AND REVIEWS

This is one of the features I consider particularly valuable.

I want student profiles to showcase what they have actually accomplished with other people.

Not just their skills or certificates.

## Previous hackathons

Show:

- Hackathon name.
- Year.
- Organizing institution.
- Team members.
- Participation status.
- Achievement.

These records should support hackathons outside the platform.

## Individual contributions

For each previous hackathon, users should be able to explain their individual contribution.

Examples:

- Developed the backend.
- Built the frontend.
- Implemented an ML model.
- Designed the UI/UX.
- Handled hardware integration.
- Led project architecture.
- Coordinated the team.

## Previous teammates

Where appropriate, profiles should show the people someone previously collaborated with.

## Reviews

After a collaboration ends, teammates should be able to review each other.

Potential review dimensions:

- Technical contribution.
- Reliability.
- Communication.
- Teamwork.
- Commitment.
- Problem-solving.

I don't want a system where someone can randomly rate anyone.

Reviews should be linked to genuine collaborations or recognized team membership.

We should also consider safeguards against revenge reviews, fake reviews and review manipulation.

# 12. TRUST, CREDIBILITY AND ACCOUNTABILITY

I am particularly interested in preventing people from joining teams and then ghosting their teammates or refusing to contribute.

# 13. DISCOVERY AND RECOMMENDATION SYSTEM

I don't want the discovery experience to show completely random students.

The platform should eventually recommend relevant people.

Potential matching factors:

- Technical skills.
- Complementary skills.
- Similar interests.
- Previous experience.
- Preferred roles.
- Collaboration preferences.
- Availability.
- Location.
- Hackathon interests.

For example:

An AI/ML developer might be recommended:

- A frontend developer.
- A backend developer.
- A UI/UX designer.
- Another AI/ML developer.

I don't want the system to recommend only people with different skills. Similar-skill connections can also be useful.

Both similar and complementary skill matching should be considered.

Users should have automatic recommendations and manual discovery filters.

I also want to discuss how students specify the type of teammate they are looking for.

# 14. HACKATHON INTEGRATION

Hackathons are the primary context for collaboration.

I want users to be able to associate their team and collaboration requests with particular hackathons.

I selected hackathon-specific collaboration groups in the initial questionnaire.

Potential workflows to explore:

- Students indicate interest in a hackathon.
- Teams associate themselves with an upcoming hackathon.
- Teams specify open positions.
- Students discover teams participating in the same event.
- Teams create hackathon-specific collaboration spaces.

A hackathon directory and automated event discovery are not yet finalized requirements.

Do not assume that the platform must become a full hackathon listing website.

# 15. CURRENT PRODUCT NAVIGATION — INITIAL CONCEPT

This is a preliminary navigation idea, not a finalized UI specification.

Potential primary sections:

1. Home / Discover.
2. People.
3. Teams.
4. Requests.
5. Messages.
6. My Profile.

Possible secondary sections:

- My Teams.
- My Hackathons.
- Collaboration History.
- Settings.

The main experience should be centered around discovering people and teams.

I want a polished, modern, professional product rather than an ordinary student portal.

The Tinder-like discovery experience is an important part of its identity.

|   |
| - |

# 17. LONG-TERM VISION

I don't want this to remain a small college project.

My long-term vision is a global network where students can discover and collaborate with other talented students for hackathons.

Initially, the focus is hackathons.

Over time, we can explore whether the network should support other collaborative opportunities.

But I don't want to expand the scope unnecessarily before the core problem is solved.

The most important thing is to create a platform where students can find genuinely good collaborators beyond their existing circles.

# 18. WHAT HAS NOT BEEN FINALIZED

These are important open decisions.

Do not treat them as completed requirements.

### Registration and identity

- Exact authentication method.
- Student verification method.
- Duplicate-account detection.
- Account recovery.

### Profiles

- Complete profile fields.
- Which information is mandatory.
- How skills are categorized.
- How achievements are verified.
- How GitHub integration works.
- Whether LinkedIn integration is included.

### Discovery

- Exact discovery algorithm.
- Teammate preference configuration.
- Whether skipped profiles reappear.
- Whether gestures and buttons coexist.
- How team discovery differs from people discovery.

### Team formation

- Team creation workflow.
- Team leader/admin permissions.
- Recruitment approval.
- Team capacity.
- Joining and leaving teams.
- Managing multiple hackathons.
- Team lifecycle and closure.

### Communication

- Exact messaging capabilities.
- Group chat permissions.
- Notifications.
- Whether external communication integrations are needed.

### Trust and reputation

- Review rules.
- Reputation scoring.
- Verification mechanisms.
- Ghosting and non-contribution handling.
- Reporting and moderation.

### Business and technology

- Monetization.
- Platform choice.
- Technical architecture.
- Database design.
- Hosting.
- Development timeline.





Don't assume the concept is entirely new simply because the interaction resembles Tinder.

#
