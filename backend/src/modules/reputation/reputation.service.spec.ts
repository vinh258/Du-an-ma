import { ReputationService } from './reputation.service';
import { User } from '../users/entities/user.entity';
import { ReputationLog } from './entities/reputation-log.entity';

describe('ReputationService', () => {
  const service = new ReputationService({} as any);

  it('cộng điểm và ghi log trong cùng transaction manager', async () => {
    const manager = { increment: jest.fn(), insert: jest.fn() };
    await service.adjust(manager as any, 7, 10, 'DOC_APPROVED', 42);

    expect(manager.increment).toHaveBeenCalledWith(User, { id: 7 }, 'reputationScore', 10);
    expect(manager.insert).toHaveBeenCalledWith(ReputationLog, { userId: 7, delta: 10, reason: 'DOC_APPROVED', refDocumentId: 42 });
  });

  it('trừ điểm dùng delta âm và refDocumentId có thể rỗng', async () => {
    const manager = { increment: jest.fn(), insert: jest.fn() };
    await service.adjust(manager as any, 3, -20, 'VIOLATION');

    expect(manager.increment).toHaveBeenCalledWith(User, { id: 3 }, 'reputationScore', -20);
    expect(manager.insert).toHaveBeenCalledWith(ReputationLog, expect.objectContaining({ delta: -20, refDocumentId: null }));
  });
});
