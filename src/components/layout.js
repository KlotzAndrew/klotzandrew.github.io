import React from "react"
import { Link } from "gatsby"

const Layout = ({ location, title, children }) => {
  const rootPath = `${__PATH_PREFIX__}/`
  let header

  // if (location.pathname === rootPath) {
  header = <div className="flex items-center">
    <h1 className="text-2xl flex-1">
      <Link to={`/`}>
        {title}
      </Link>
    </h1>

    <Link to={`/blog`}>
      Blog
    </Link>
  </div>

  return (
    <div className="max-w-4xl m-auto">
      <div className="mx-6">
        <header>{header}</header>
        <hr className="mb-8" />
        <main>{children}</main>
        <footer>
        </footer>
      </div>
    </div>
  )
}

export default Layout
