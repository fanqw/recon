import React from 'react';

interface Props {
  name: string;
}

const Demo: React.FC<Props> = ({ name }) => {
  return <div>登录页, {name}!</div>;
};

export default Demo;
