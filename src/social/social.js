import React from "react";
import { useStaticQuery, graphql } from "gatsby";
import Image from "gatsby-image";

const Social = () => {
  const data = useStaticQuery(graphql`
    query SocialQuery {
      site {
        siteMetadata {
          author {
            name
            summary
          }
          social {
            twitter
            linkedin
            github
            email
          }
        }
      }
    }
  `);

  const { social } = data.site.siteMetadata;
  return (
    <div className="flex justify-center">
      <a
        className="px-1 hover:underline hover:text-blue-500"
        target="_blank"
        href={`https://github.com/${social.github}`}
      >
        Github
      </a>
      <a
        className="px-1 hover:underline hover:text-blue-500"
        target="_blank"
        href={`https://www.linkedin.com/in/${social.linkedin}`}
      >
        Linkedin
      </a>
      <a
        className="px-1 hover:underline hover:text-blue-500"
        target="_blank"
        href={`https://twitter.com/${social.twitter}`}
      >
        Twitter
      </a>
      <a
        className="px-1 hover:underline hover:text-blue-500"
        target="_blank"
        href={`mailto: ${social.email}`}
      >
        Email
      </a>
    </div>
  );
};

export default Social;
