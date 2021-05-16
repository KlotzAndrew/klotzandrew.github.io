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

      <div className="mt-20 lg:flex">
        <div className="mb-4">
          <Image
            className="m-auto"
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

        <div className="mb-4 mx-4 flex flex-col justify-between">
          <p className="italic bold text-xl mb-4">Ensure people have the tools to be their best</p>

          <p className="mb-4" style={{ textIndent: "3em" }}>
            Andrew Klotz has been a software engineering leader in multiple industries, including Finance, Healthcare, Marketing, and Video Games. He earned a Master's Degree in International Business while studying in Shanghai, China, and uses his business and technical background to deliver high-impact projects for organizations.
          </p>
          <Social />
        </div>
      </div>

      <div className="my-20"></div>

      <div className="flex flex-wrap">
        {posts.map(({ node }) => {
          const title = node.frontmatter.title || node.fields.slug;
          const img = node.frontmatter.featured && node.frontmatter.featured.childImageSharp.fluid;
          if (!node.frontmatter.title) return; // <div key={node.fields.slug}></div>;

          return (
            <article className="mx-2 w-full" key={node.fields.slug}>
              <Link className="" to={node.fields.slug}>
                <div className="hover:bg-gray-200">
                  {/* <div className="h-48 mb-2">
                    {img && (
                      <Image
                        imgStyle={{ objectFit: "contain" }}
                        className="h-full"
                        fluid={node.frontmatter.featured.childImageSharp.fluid}
                      />
                    )}
                  </div> */}

                  <h3 className="block md:flex justify-between">
                    <div className="text-xl text-blue-500 truncate">{title}</div>
                    <div className="">{node.frontmatter.date}</div>
                  </h3>
                  {/* <section>
                      <p
                        className=""
                        dangerouslySetInnerHTML={{
                          __html: node.frontmatter.description || node.excerpt,
                        }}
                      />
                    </section> */}
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
            date(formatString: "MMM DD, YYYY")
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
