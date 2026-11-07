import { BadRequestException, NotFoundException } from '@nestjs/common';
import { DocumentStatus } from '../../common/enums';
import { InteractionsService } from './interactions.service';

const user: any = { id: 1, role: 'STUDENT', fullName: 'A', email: 'a@t.com' };

function make(doc: any) {
  const docs: any = { findOneBy: jest.fn().mockResolvedValue(doc) };
  const dataSource: any = { transaction: jest.fn() };
  return new InteractionsService(dataSource, docs, {} as any, {} as any, {} as any, {} as any);
}

describe('InteractionsService.rate', () => {
  it('không cho tự đánh giá tài liệu của mình', async () => {
    const s = make({ id: 9, uploaderId: 1, status: DocumentStatus.APPROVED });
    await expect(s.rate(9, user, 5)).rejects.toBeInstanceOf(BadRequestException);
  });

  it('không đánh giá tài liệu chưa được duyệt', async () => {
    const s = make({ id: 9, uploaderId: 2, status: DocumentStatus.PENDING });
    await expect(s.rate(9, user, 5)).rejects.toBeInstanceOf(NotFoundException);
  });
});
