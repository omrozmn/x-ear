import React from 'react';
import SGKList from '../../components/sgk/SGKList';

export const SGKPage: React.FC = () => {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold mb-4">SGK Kayıtları</h1>
      <SGKList />
    </div>
  );
};

export default SGKPage;
