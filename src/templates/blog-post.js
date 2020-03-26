import React from "react"
import { Link, graphql } from "gatsby"
import { Disqus, CommentCount } from 'gatsby-plugin-disqus'

import Bio from "../components/bio"
import Layout from "../components/layout"
import SEO from "../components/seo"

const BlogPostTemplate = ({ data, pageContext, location }) => {
  const post = data.markdownRemark
  const siteTitle = data.site.siteMetadata.title
  const { previous, next } = pageContext

  let disqusConfig = {
    url: location.href,
    identifier: post.id,
    title: post.title
  }

  return (
    <Layout location={location} title={siteTitle}>
      <SEO
        title={post.frontmatter.title}
        description={post.frontmatter.description || post.excerpt}
        image={post.frontmatter.image}
      />
      <article>
        <header className="mb-8">
          <h1 className="text-3xl font-bold mb-2 leading-none tracking-tight">
            {post.frontmatter.title}
          </h1>
          <p className="text-gray-600">
            {post.frontmatter.date}
          </p>
        </header>
        <section className="markdown" dangerouslySetInnerHTML={{ __html: post.html }} />
        <hr className="my-12" />
        <footer>
          <Bio />
        </footer>
      </article>

      <nav className="my-12">
        <ul className="flex flex-wrap">
          <li className="my-2 no-underline hover:underline text-blue-500 text-lg">
            {previous && (
              <Link to={previous.fields.slug} rel="prev">
                ← {previous.frontmatter.title}
              </Link>
            )}
          </li>
          <li className="my-2 no-underline hover:underline text-blue-500 text-lg">
            {next && (
              <Link to={next.fields.slug} rel="next">
                {next.frontmatter.title} →
              </Link>
            )}
          </li>
        </ul>
      </nav>

      {/* <CommentCount config={disqusConfig} placeholder={'...'} /> */}
      <Disqus config={disqusConfig} />
    </Layout>
  )
}

export default BlogPostTemplate

export const pageQuery = graphql`
  query BlogPostBySlug($slug: String!) {
    site {
      siteMetadata {
        title
      }
    }
    markdownRemark(fields: { slug: { eq: $slug } }) {
      id
      excerpt(pruneLength: 160)
      html
      frontmatter {
        title
        date(formatString: "MMMM DD, YYYY")
        description
        image
      }
    }
  }
`
