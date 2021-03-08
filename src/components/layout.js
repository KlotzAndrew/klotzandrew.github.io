import React from "react";
import { Link } from "gatsby";

const HotJar = () => {
  return (
    <script
      dangerouslySetInnerHTML={{
        __html: `
              (function(h,o,t,j,a,r){
                  h.hj=h.hj||function(){(h.hj.q=h.hj.q||[]).push(arguments)};
                  h._hjSettings={hjid:1889023,hjsv:6};
                  a=o.getElementsByTagName('head')[0];
                  r=o.createElement('script');r.async=1;
                  r.src=t+h._hjSettings.hjid+j+h._hjSettings.hjsv;
                  a.appendChild(r);
              })(window,document,'https://static.hotjar.com/c/hotjar-','.js?sv=')
          `,
      }}
    />
  );
};

const Layout = ({ location, title, children }) => {
  const rootPath = `${__PATH_PREFIX__}/`;
  let header;

  // if (location.pathname === rootPath) {
  header = (
    <div className="flex items-center">
      <h1 className="text-2xl flex-1">
        <Link to={`/`}>{title}</Link>
      </h1>

      <Link className={"mx-2"} to={`/blog`}>Blog</Link>
      <Link className={"mx-2"} to={`/projects`}>Projects</Link>
    </div>
  );

  return (
    <div className="max-w-4xl m-auto">
      <div className="mx-6">
        <HotJar />

        <header>{header}</header>
        <hr className="mb-8" />
        <main>{children}</main>
        <footer></footer>
      </div>
    </div>
  );
};

export default Layout;
