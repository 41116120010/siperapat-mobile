import { ASN, Meeting } from '../../domain/entities/types';

/**
 * Checks whether the current user is authorized to delete a meeting agenda.
 * Rules:
 * 1. Administrator: Can delete any meeting.
 * 2. Admin Unit: Can only delete a meeting if it belongs to/targets the user's unit,
 *    or if the meeting was created by a user from the same unit.
 * 3. Staff: Cannot delete any meeting.
 */
export function canDeleteMeeting(user: ASN | null, meeting: Meeting | null): boolean {
  if (!user || !meeting) return false;
  const role = (user.role ?? '').toLowerCase().trim();

  // 1. Super Administrator has full deletion rights across all agendas
  if (role === 'administrator') {
    return true;
  }

  // 2. Admin Unit
  const isAdminUnit = role === 'admin' || role === 'admin_unit' || role === 'admin unit';
  if (isAdminUnit) {
    // Creator of the meeting
    if (meeting.creatorId && String(meeting.creatorId) === String(user.id)) {
      return true;
    }

    if (user.unitId) {
      // Creator's unit matches current admin's unit
      if (meeting.creatorUnitId && meeting.creatorUnitId === user.unitId) {
        return true;
      }

      // Specific non-universal meeting targeted to user's unit
      if (!meeting.isAllUnits && meeting.unitIds && meeting.unitIds.includes(user.unitId)) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Checks whether the current user is authorized to edit a meeting agenda.
 * Rules:
 * 1. Administrator: Can edit any meeting.
 * 2. Admin Unit: Can edit meetings of their unit or meetings with universal scope.
 * 3. Meeting Creator / Leader: Can edit their own meeting.
 */
export function canEditMeeting(user: ASN | null, meeting: Meeting | null): boolean {
  if (!user || !meeting) return false;
  const role = (user.role ?? '').toLowerCase().trim();

  if (role === 'administrator') return true;

  const isAdminUnit = role === 'admin' || role === 'admin_unit' || role === 'admin unit';
  if (isAdminUnit) {
    if (user.unitId && meeting.unitIds && meeting.unitIds.includes(user.unitId)) return true;
    if (user.unitId && meeting.creatorUnitId && meeting.creatorUnitId === user.unitId) return true;
    if (meeting.isAllUnits) return true;
    if (
      user.unitKerja &&
      meeting.targetAudience &&
      meeting.targetAudience.toLowerCase().includes(user.unitKerja.toLowerCase())
    ) {
      return true;
    }
  }

  // Assigned Leader or Creator
  if (meeting.leaderId && String(meeting.leaderId) === user.id) return true;
  if (meeting.creatorId && String(meeting.creatorId) === user.id) return true;

  return false;
}
