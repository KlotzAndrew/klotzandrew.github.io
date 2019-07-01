.PHONY: start
start:
	docker run --rm \
		-v $(PWD):/usr/src \
		-w /usr/src \
		-p 4000:4000 \
		ruby:2.6.0-stretch bash -c "bundle install && jekyll serve --host 0.0.0.0"
