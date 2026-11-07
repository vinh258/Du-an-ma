import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import DocumentRow from '../components/DocumentRow';
import { Empty, ErrorBox, Pagination, Spinner } from '../components/ui';
import { api, errMsg } from '../lib/api';
import { Doc, Page } from '../lib/types';

export default function Bookmarks() {
  const [page, setPage] = useState(1);
  const { data, isLoading, error } = useQuery({
    queryKey: ['bookmarks', page],
    queryFn: async () => (await api.get<Page<Doc>>('/users/me/bookmarks', { params: { page, limit: 10 } })).data,
  });
  return (
    <div>
      <h1 className="mb-5 text-3xl">Tài liệu đã lưu</h1>
      {isLoading && <Spinner />}
      {error && <ErrorBox text={errMsg(error)} />}
      {data && data.items.length === 0 && <Empty title="Chưa lưu tài liệu nào" hint="Bấm “Lưu tài liệu” ở trang chi tiết để xem lại sau." action={<Link to="/" className="btn-primary">Khám phá tài liệu</Link>} />}
      {data && data.items.length > 0 && (
        <>
          <div className="space-y-3">{data.items.map((d) => <DocumentRow key={d.id} doc={d} />)}</div>
          <Pagination page={data.page} totalPages={data.totalPages} onChange={setPage} />
        </>
      )}
    </div>
  );
}
