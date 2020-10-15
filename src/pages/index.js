import React from "react";
import { Link, graphql } from "gatsby";
import Image from "gatsby-image";

import Bio from "../components/bio";
import Layout from "../components/layout";
import SEO from "../components/seo";
import Social from "../social/social";

const BlogIndex = ({ data, location }) => {
  const siteTitle = data.site.siteMetadata.title;
  const { author, social } = data.site.siteMetadata;

  const posts = data.allMarkdownRemark.edges;

  return (
    <Layout location={location} title={siteTitle}>
      <SEO title="" />

      <div className="mt-20 flex">
        <div className="">
          <Image
            className=""
            fluid={data.avatar.childImageSharp.fluid}
            alt={author.name}
            style={{
              maxWidth: 200,
              minWidth: 200,
              borderRadius: `100%`,
            }}
            imgStyle={{
              borderRadius: `50%`,
            }}
          />
        </div>

        <div className="mx-4 flex flex-col justify-between">
          <p className="italic bold text-xl mb-4">Ensure people have the tools to be their best</p>

          <p style={{ textIndent: "3em" }}>
            Andrew Klotz is a an Entrepreneur and Software Engineer with a Masters Degree in
            business. He brings his technical and business experience to deliver high-impact
            projects.
          </p>
          <Social />
        </div>
      </div>

      <div className="my-20"></div>

      <div className="flex flex-wrap justify-center">
        {posts.map(({ node }) => {
          const title = node.frontmatter.title || node.fields.slug;
          const img = node.frontmatter.featured && node.frontmatter.featured.childImageSharp.fluid;
          if (!node.frontmatter.title) return; // <div key={node.fields.slug}></div>;

          return (
            <article className="mx-2 mb-12 w-full" key={node.fields.slug}>
              <Link className="" to={node.fields.slug}>
                <div className="hover:bg-gray-200 p-2">
                  {/* <div className="h-48 mb-2">
                    {img && (
                      <Image
                        imgStyle={{ objectFit: "contain" }}
                        className="h-full"
                        fluid={node.frontmatter.featured.childImageSharp.fluid}
                      />
                    )}
                  </div> */}

                  <div>
                    <h3>
                      <div className="text-xl font-bold text-blue-500">{title}</div>
                    </h3>
                    <small>{node.frontmatter.date}</small>

                    <section>
                      <p
                        className=""
                        dangerouslySetInnerHTML={{
                          __html: node.frontmatter.description || node.excerpt,
                        }}
                      />
                    </section>
                  </div>
                </div>
              </Link>
            </article>
          );
        })}
      </div>
    </Layout>
  );
};

export default BlogIndex;

export const pageQuery = graphql`
  query {
    site {
      siteMetadata {
        title

        author {
          name
          summary
        }
        social {
          twitter
        }
      }
    }
    avatar: file(absolutePath: { regex: "/andrew-2019-03-24_300x300_min.jpg/" }) {
      childImageSharp {
        fluid(quality: 100) {
          ...GatsbyImageSharpFluid
        }
      }
    }
    allMarkdownRemark(sort: { fields: [frontmatter___date], order: DESC }) {
      edges {
        node {
          excerpt
          fields {
            slug
          }
          frontmatter {
            date(formatString: "MMMM DD, YYYY")
            title
            description

            featured {
              childImageSharp {
                fluid(maxWidth: 800) {
                  ...GatsbyImageSharpFluid
                }
              }
            }
          }
        }
      }
    }
  }
`;
