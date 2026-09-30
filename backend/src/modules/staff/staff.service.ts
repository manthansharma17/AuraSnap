import { transaction } from '../../db/database.js';
import { conflict, notFound } from '../../lib/errors.js';
import { staffRepository, type StaffMember } from './staff.repository.js';
import type { CreateStaffInput, UpdateStaffInput } from './staff.schemas.js';

export const staffService = {
  list(accountId: string): StaffMember[] {
    return staffRepository.list(accountId);
  },

  create(accountId: string, input: CreateStaffInput): StaffMember {
    return transaction(() => {
      const empId = input.empId ?? staffRepository.nextEmpId(accountId);
      if (staffRepository.find(accountId, empId)) throw conflict(`Employee ${empId} already exists.`);
      const member: StaffMember = {
        empId,
        name: input.name,
        role: input.role,
        area: input.area,
        from: input.from,
        to: input.to,
        phone: input.phone,
        email: input.email,
        notify: input.notify,
      };
      staffRepository.insert(accountId, member);
      return member;
    });
  },

  update(accountId: string, empId: string, input: UpdateStaffInput): StaffMember {
    return transaction(() => {
      if (!staffRepository.find(accountId, empId)) throw notFound(`Employee ${empId} was not found.`);
      const member: StaffMember = { empId, ...input };
      staffRepository.update(accountId, member);
      return member;
    });
  },

  remove(accountId: string, empId: string): void {
    if (!staffRepository.delete(accountId, empId)) throw notFound(`Employee ${empId} was not found.`);
  },
};
