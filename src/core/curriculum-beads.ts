/**
 * Curriculum-BEADS Integration
 *
 * Maps curriculum structures to BEADS issues for tracking
 */

import { Curriculum } from '../types';
import { createIssue, addDependency } from './beads';

/**
 * Create BEADS epics and tasks from a curriculum
 */
export function createBeadsFromCurriculum(curriculum: Curriculum): {
  curriculumEpicId: string;
  phaseEpicIds: Map<string, string>;
  deliverableTaskIds: Map<string, string>;
} {
  const phaseEpicIds = new Map<string, string>();
  const deliverableTaskIds = new Map<string, string>();

  // Create main curriculum epic
  const curriculumEpicId = createIssue(
    `Curriculum: ${curriculum.title}`,
    {
      description: curriculum.description,
      type: 'epic',
      priority: 0,
      labels: ['curriculum', curriculum.topic],
    }
  );

  // Create epics for each phase
  curriculum.phases.forEach((phase, index) => {
    const phaseEpicId = createIssue(
      `Phase ${phase.number}: ${phase.title}`,
      {
        description: phase.description,
        type: 'epic',
        priority: 1,
        labels: ['phase', `phase-${phase.number}`, phase.growthStage],
      }
    );

    phaseEpicIds.set(phase.id, phaseEpicId);

    // Link phase to curriculum (child depends on parent)
    addDependency(phaseEpicId, curriculumEpicId, 'parent-child');

    // Link phase to previous phase (sequential)
    if (index > 0) {
      const previousPhase = curriculum.phases[index - 1];
      if (previousPhase) {
        const previousPhaseEpicId = phaseEpicIds.get(previousPhase.id);
        if (previousPhaseEpicId) {
          addDependency(phaseEpicId, previousPhaseEpicId, 'blocks');
        }
      }
    }

    // Create tasks for deliverables
    phase.deliverables.forEach((deliverable, delIndex) => {
      const taskId = createIssue(
        deliverable.title,
        {
          description: `${deliverable.description}\n\n**Acceptance Criteria:**\n${deliverable.acceptanceCriteria.map(c => `- [ ] ${c}`).join('\n')}`,
          type: 'task',
          priority: 2,
          labels: ['deliverable', `phase-${phase.number}`],
        }
      );

      deliverableTaskIds.set(deliverable.id, taskId);

      // Link deliverable to phase epic (child depends on parent)
      addDependency(taskId, phaseEpicId, 'parent-child');

      // Sequential dependencies within phase
      if (delIndex > 0) {
        const previousDeliverable = phase.deliverables[delIndex - 1];
        if (previousDeliverable) {
          const previousTaskId = deliverableTaskIds.get(previousDeliverable.id);
          if (previousTaskId) {
            addDependency(taskId, previousTaskId, 'blocks');
          }
        }
      }
    });
  });

  return {
    curriculumEpicId,
    phaseEpicIds,
    deliverableTaskIds,
  };
}

/**
 * Update curriculum with BEADS IDs
 */
export function linkCurriculumToBeads(
  curriculum: Curriculum,
  beadsIds: {
    curriculumEpicId: string;
    phaseEpicIds: Map<string, string>;
    deliverableTaskIds: Map<string, string>;
  }
): Curriculum {
  return {
    ...curriculum,
    phases: curriculum.phases.map(phase => ({
      ...phase,
      beadsEpicId: beadsIds.phaseEpicIds.get(phase.id),
      deliverables: phase.deliverables.map(deliverable => ({
        ...deliverable,
        beadsTaskId: beadsIds.deliverableTaskIds.get(deliverable.id),
      })),
    })),
  };
}
