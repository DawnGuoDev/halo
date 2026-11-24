import { consoleApiClient } from "@halo-dev/api-client";
import { useQuery } from "@tanstack/vue-query";
import { computed, toValue, type MaybeRefOrGetter } from "vue";
import { usePostCategory } from "../categories/composables/use-post-category";
import { useAllPostTagsQuery } from "../tags/composables/use-post-tag";

/**
 * Resolves the display names of the filter values used by the post list.
 *
 * The values (category/tag/author names) are opaque identifiers in the URL
 * query. This composable maps them to the names editors see in the filter
 * dropdowns. Until a name is loaded, the identifier is used as a placeholder so
 * the filter chip stays removable.
 */
export function usePostFilterValues(options: {
  category?: MaybeRefOrGetter<string | undefined>;
  tag?: MaybeRefOrGetter<string | undefined>;
  contributor?: MaybeRefOrGetter<string | undefined>;
}) {
  const categoryName = options.category;
  const tagName = options.tag;
  const contributorName = options.contributor;

  const { categories } = usePostCategory();
  const { data: tags } = useAllPostTagsQuery();

  const categoryDisplayName = computed(() => {
    const name = toValue(categoryName);
    if (!name) {
      return undefined;
    }
    return (
      categories.value?.find((category) => category.metadata.name === name)
        ?.spec.displayName ?? name
    );
  });

  const tagDisplayName = computed(() => {
    const name = toValue(tagName);
    if (!name) {
      return undefined;
    }
    return (
      tags.value?.find((item) => item.metadata.name === name)?.spec
        .displayName ?? name
    );
  });

  const { data: contributor } = useQuery({
    queryKey: ["core:users:by-name", toValue(contributorName) ?? ""],
    queryFn: async () => {
      const name = toValue(contributorName);
      if (!name) {
        return null;
      }
      const { data } = await consoleApiClient.user.getUserDetail({ name });
      return data.user;
    },
    enabled: computed(() => !!toValue(contributorName)),
    cacheTime: 0,
  });

  const contributorDisplayName = computed(() => {
    const name = toValue(contributorName);
    if (!name) {
      return undefined;
    }
    return contributor.value?.metadata.name === name
      ? (contributor.value?.spec.displayName ?? name)
      : name;
  });

  return {
    categoryDisplayName,
    tagDisplayName,
    contributorDisplayName,
  };
}
