-- Identity layer: the self-concept (the story) and its felt-sense (the
-- heart's verdict on the story). The lived identity is never stored - it is
-- always derived from what the user actually did.
ALTER TABLE "mainxp_north_stars" ADD COLUMN "selfConcept" TEXT NOT NULL DEFAULT '';
ALTER TABLE "mainxp_north_stars" ADD COLUMN "identityFelt" INTEGER;
