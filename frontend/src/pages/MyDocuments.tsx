import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import DocumentRow from '../components/DocumentRow';
import DeleteDocModal from '../components/DeleteDocModal';
import { Empty, ErrorBox, Pagination, Spinner } from '../components/ui';
import { api, errMsg } from '../lib/api';
import { Doc, Page } from '../lib/types';

export default function MyDocuments() {
  const [page, setPage] = useState(1);
  const [deleting, setDeleting] = useState<Doc | null>(null);
  const { data, isLoading, error } = useQuery({
    queryKey: ['my-docs', page],
    queryFn: async () => (await api.get<Page<Doc>>('/documents/me', { params: { page, limit: 10 } })).data,
  });
  return (
    <div>
      <h1 className="mb-1 text-3xl">Tài liệu của tôi</h1>
      <p className="mb-5 text-sm text-muted">Theo dõi trạng thái kiểm duyệt các tài liệu bạn đã đăng.</p>
      {isLoading && <Spinner />}
      {error && <ErrorBox text={errMsg(error)} />}
      {data && data.items.length === 0 && <Empty title="Bạn chưa đăng tài liệu nào" action={<Link to="/upload" className="btn-primary">Đăng tài liệu đầu tiên</Link>} />}
      {data && data.items.length > 0 && (
        <>
          <div className="space-y-3">
            {data.items.map((d) => (
              <DocumentRow key={d.id} doc={d} showStatus actions={
                <>
                  <Link to={`/documents/${d.id}/edit`} className="btn-outline btn-sm">Sửa</Link>
                  <button className="btn-outline btn-sm text-danger" onClick={() => setDeleting(d)}>Xóa</button>
                </>
              } />
            ))}
          </div>
          <Pagination page={data.page} totalPages={data.totalPages} onChange={setPage} />
        </>
      )}
      {deleting && <DeleteDocModal doc={deleting} byAdmin={false} onClose={() => setDeleting(null)} />}
    </div>
  );
}
